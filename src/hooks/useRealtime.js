import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to real-time changes on a Supabase table.
 * @param {string} channel - unique channel name
 * @param {string} table - table name
 * @param {string} filter - e.g. "tournament_id=eq.abc"
 * @param {function} callback - called with payload on change
 * @param {string[]} events - ['INSERT','UPDATE','DELETE']
 */
export function useRealtime(channel, table, filter, callback, events = ['INSERT', 'UPDATE', 'DELETE']) {
  useEffect(() => {
    if (!channel || !table) return
    let sub = supabase.channel(channel)
    for (const event of events) {
      sub = sub.on('postgres_changes', { event, schema: 'public', table, filter }, callback)
    }
    sub.subscribe()
    return () => supabase.removeChannel(sub)
  }, [channel, table, filter])
}
