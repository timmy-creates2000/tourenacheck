import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const loadingTimerRef = useRef(null)

  function startLoadingTimeout() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    loadingTimerRef.current = setTimeout(() => setLoading(false), 4000)
  }

  function stopLoading() {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    setLoading(false)
  }

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Fetch profile error:', error)
        return null
      }
      
      if (data) {
        setProfile(data)
        return data
      }
    } catch (err) {
      console.error('Fetch profile exception:', err)
    }
    return null
  }, [])

  useEffect(() => {
    let mounted = true
    let isInitializing = true
    
    startLoadingTimeout()

    // Initialize auth state
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (!session) {
          setUser(null)
          setProfile(null)
          stopLoading()
          return
        }

        // Have session - set user and fetch profile
        setUser(session.user)
        await fetchProfile(session.user.id)
        stopLoading()
      } catch (err) {
        console.error('Auth init error:', err)
        stopLoading()
      } finally {
        isInitializing = false
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip initial SIGNED_IN event during initialization
      if (isInitializing && event === 'SIGNED_IN') return
      
      if (!mounted) return
      
      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          // Only ensure profile on actual sign in, not on page load
          if (event === 'SIGNED_IN') {
            await ensureProfile(currentUser)
          }
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
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
        setProfile(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function ensureProfile(authUser) {
    try {
      // Check if profile exists
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()
      
      if (checkError) {
        console.error('Check profile error:', checkError)
      }
      
      if (existing) return // Profile already exists
      
      // Create new profile
      const meta = authUser.user_metadata ?? {}
      const username = meta.username
        || meta.full_name?.replace(/\s+/g, '_').toLowerCase()
        || authUser.email?.split('@')[0]
        || `user_${authUser.id.slice(0, 6)}`
      
      const { error: upsertError } = await supabase.from('users').upsert({
        id: authUser.id, 
        email: authUser.email, 
        username,
        display_name: meta.full_name ?? null, 
        avatar_url: meta.avatar_url ?? null,
        role: 'player', 
        referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        account_status: 'approved', 
        coin_balance: 0, 
        preferred_currency: 'NGN',
      }, { onConflict: 'id', ignoreDuplicates: true })
      
      if (upsertError) {
        console.error('Upsert profile error:', upsertError)
      }
      
      // Create player stats
      const { error: statsError } = await supabase.from('player_stats')
        .upsert({ user_id: authUser.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      
      if (statsError) {
        console.error('Upsert stats error:', statsError)
      }
    } catch (err) {
      console.error('Ensure profile exception:', err)
    }
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
