import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTournament(id) {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('tournaments').select('*').eq('id', id).single()
      .then(({ data }) => { setTournament(data); setLoading(false) })

    const channel = supabase.channel(`tournament-hook:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        (payload) => setTournament(prev => ({ ...prev, ...payload.new }))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  return { tournament, loading }
}
