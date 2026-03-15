import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        if (data) {
          setProfile(data)
          return data
        }
        // PGRST116 = no rows found — no point retrying
        if (error?.code === 'PGRST116') break
      } catch (_) {
        // network error — retry
      }
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500))
    }
    setProfile(null)
    return null
  }, [])

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // INITIAL_SESSION = page load with existing session (no ensureProfile needed)
          // SIGNED_IN = actual new login (OAuth or password)
          if (event === 'SIGNED_IN') await ensureProfile(currentUser)
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        setProfile(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
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
      role: meta.role ?? 'player',
      referral_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      account_status: 'pending',
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

  async function signUp({ email, password, username, role, referralCode }) {
    const { data: existing } = await supabase
      .from('users').select('id').eq('username', username).single()
    if (existing) throw new Error('Username already taken')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, role } },
    })
    if (error) throw error

    if (referralCode && data.user) {
      setTimeout(async () => {
        const { data: ref } = await supabase
          .from('users').select('id').eq('referral_code', referralCode).single()
        if (ref) {
          await supabase.from('users')
            .update({ referred_by: ref.id }).eq('id', data.user.id)
        }
      }, 2000)
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

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
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
