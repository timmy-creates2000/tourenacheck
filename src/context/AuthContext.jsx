import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const PROFILE_KEY = 'tourena_profile'
const USER_KEY    = 'tourena_user'

function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch (_) {}
}
function loadFromStorage(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch (_) { return null }
}
function clearStorage() {
  try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(USER_KEY) } catch (_) {}
}

export function AuthProvider({ children }) {
  // Seed state from localStorage immediately — no blank flash on refresh
  // Use refs to read once at mount time only
  const hasCachedUser = useRef(!!loadFromStorage(USER_KEY))
  const [user, setUser]       = useState(() => loadFromStorage(USER_KEY))
  const [profile, setProfile] = useState(() => loadFromStorage(PROFILE_KEY))
  // If we have cached data, start as NOT loading — app renders immediately
  const [loading, setLoading] = useState(!hasCachedUser.current)
  const loadingTimerRef = useRef(null)

  function startLoadingTimeout() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    loadingTimerRef.current = setTimeout(() => setLoading(false), 4000)
  }

  function stopLoading() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    setLoading(false)
  }

  function setAndCacheUser(u) {
    setUser(u)
    if (u) saveToStorage(USER_KEY, u)
    else clearStorage()
  }

  function setAndCacheProfile(p) {
    setProfile(p)
    if (p) saveToStorage(PROFILE_KEY, p)
    else localStorage.removeItem(PROFILE_KEY)
  }

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) {
        setAndCacheProfile(data)
        return data
      }
    } catch (_) {}
    return null
  }, [])

  useEffect(() => {
    let mounted = true
    // Only start timeout if we don't have cached data (i.e., loading is true)
    if (!hasCachedUser.current) startLoadingTimeout()

    // Fast path: check session — if none, clear cache immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        setAndCacheUser(null)
        setAndCacheProfile(null)
        stopLoading()
      }
      // If session exists, onAuthStateChange will handle it
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      try {
        const currentUser = session?.user ?? null
        setAndCacheUser(currentUser)
        if (currentUser) {
          if (event === 'SIGNED_IN') await ensureProfile(currentUser)
          await fetchProfile(currentUser.id)
        } else {
          setAndCacheProfile(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
      } finally {
        if (mounted) stopLoading()
      }
    })

    return () => {
      mounted = false
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Real-time profile/balance updates
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}`
      }, (payload) => {
        setProfile(prev => {
          const updated = { ...prev, ...payload.new }
          saveToStorage(PROFILE_KEY, updated)
          return updated
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function ensureProfile(authUser) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('id', authUser.id).single()
    if (existing) return
    const meta = authUser.user_metadata ?? {}
    const username = meta.username
      || meta.full_name?.replace(/\s+/g, '_').toLowerCase()
      || authUser.email?.split('@')[0]
      || `user_${authUser.id.slice(0, 6)}`
    await supabase.from('users').upsert({
      id: authUser.id, email: authUser.email, username,
      display_name: meta.full_name ?? null, avatar_url: meta.avatar_url ?? null,
      role: 'player', referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      account_status: 'approved', coin_balance: 0, preferred_currency: 'NGN',
    }, { onConflict: 'id', ignoreDuplicates: true })
    await supabase.from('player_stats')
      .upsert({ user_id: authUser.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  }

  async function signUp({ email, password, username, referralCode }) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).single()
    if (existing) throw new Error('Username already taken')
    const { data, error } = await supabase.auth.signUp({
      email, 
      password, 
      options: { 
        data: { username },
        emailRedirectTo: `${window.location.origin}/`
      },
    })
    if (error) throw error
    if (referralCode && data.user) {
      const userId = data.user.id
      const applyReferral = async () => {
        const { data: ref } = await supabase
          .from('users').select('id').eq('referral_code', referralCode.trim().toUpperCase()).single()
        if (!ref) return
        for (let i = 0; i < 5; i++) {
          const { data: newUser } = await supabase.from('users').select('id').eq('id', userId).single()
          if (newUser) { await supabase.from('users').update({ referred_by: ref.id }).eq('id', userId); return }
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      applyReferral()
    }
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  async function signIn({ identifier, password }) {
    const isEmail = identifier.includes('@')
    if (isEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password })
      if (error) {
        // Provide better error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password')
        }
        throw error
      }
      return data
    } else {
      const { data: userData, error: userError } = await supabase
        .from('users').select('email').eq('username', identifier).single()
      if (userError || !userData) {
        throw new Error('Invalid username or password')
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: userData.email, password })
      if (error) {
        // Provide better error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid username or password')
        }
        throw error
      }
      return data
    }
  }

  async function signOut() {
    // Clear cache and state immediately — don't wait for Supabase
    clearStorage()
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
