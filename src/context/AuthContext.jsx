import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadingTimerRef = useRef(null)

  // Hard safety net — never stay loading more than 4 seconds
  function startLoadingTimeout() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    loadingTimerRef.current = setTimeout(() => setLoading(false), 4000)
  }

  function stopLoading() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    setLoading(false)
  }

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) {
        setProfile(data)
        return data
      }
    } catch (_) {}
    setProfile(null)
    return null
  }, [])

  useEffect(() => {
    let mounted = true
    startLoadingTimeout()

    // Fast path: if no session, resolve immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) {
        setUser(null)
        setProfile(null)
        stopLoading()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          if (event === 'SIGNED_IN') await ensureProfile(currentUser)
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        setProfile(null)
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

  // Ensure a profile row exists — handles OAuth users where trigger may be slow
  async function ensureProfile(authUser) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single()
    if (existing) return

    // Not found — insert manually (handles OAuth + slow trigger)
    const meta = authUser.user_metadata ?? {}
    const username = meta.username
      || meta.full_name?.replace(/\s+/g, '_').toLowerCase()
      || authUser.email?.split('@')[0]
      || `user_${authUser.id.slice(0, 6)}`

    await supabase.from('users').upsert({
      id: authUser.id,
      email: authUser.email,
      username,
      display_name: meta.full_name ?? null,
      avatar_url: meta.avatar_url ?? null,
      role: 'player', // Everyone is player by default
      referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      account_status: 'approved', // Auto-approved
      coin_balance: 0,
      preferred_currency: 'NGN',
    }, { onConflict: 'id', ignoreDuplicates: true })

    await supabase.from('player_stats')
      .upsert({ user_id: authUser.id }, { onConflict: 'user_id', ignoreDuplicates: true })
  }

  // Real-time balance updates
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}`
      }, (payload) => setProfile(prev => ({ ...prev, ...payload.new })))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function signUp({ email, password, username, referralCode }) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).single()
    if (existing) throw new Error('Username already taken')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }, // No role needed, everyone is player
    })
    if (error) throw error

    if (referralCode && data.user) {
      // Wait for the user row to exist (DB trigger may be slightly delayed), then set referred_by
      const userId = data.user.id
      const applyReferral = async () => {
        const { data: ref } = await supabase
          .from('users').select('id').eq('referral_code', referralCode.trim().toUpperCase()).single()
        if (!ref) return
        // Retry up to 5 times waiting for the new user row to be created
        for (let i = 0; i < 5; i++) {
          const { data: newUser } = await supabase.from('users').select('id').eq('id', userId).single()
          if (newUser) {
            await supabase.from('users').update({ referred_by: ref.id }).eq('id', userId)
            return
          }
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
    // Check if identifier is email or username
    const isEmail = identifier.includes('@')
    
    if (isEmail) {
      // Login with email
      const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password })
      if (error) throw error
      return data
    } else {
      // Login with username - first get email from username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('username', identifier)
        .single()
      
      if (userError || !userData) {
        throw new Error('Username not found')
      }
      
      // Now login with the email
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: userData.email, 
        password 
      })
      if (error) throw error
      return data
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
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
