import { useState, useEffect } from 'react'
import { getTimeRemaining } from '../../lib/utils'

export default function CountdownTimer({ date, label = 'Starts in', className = '' }) {
  const [remaining, setRemaining] = useState(getTimeRemaining(date))

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getTimeRemaining(date)), 1000)
    return () => clearInterval(interval)
  }, [date])

  if (!remaining) return <span className={`text-xs text-muted ${className}`}>Started</span>

  const { days, hours, minutes, seconds } = remaining
  return (
    <span className={`text-xs font-mono text-accent ${className}`}>
      {label && <span className="text-muted mr-1">{label}</span>}
      {days > 0 && `${days}d `}{String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
    </span>
  )
}
