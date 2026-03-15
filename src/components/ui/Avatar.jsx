import { Link } from 'react-router-dom'

/**
 * Verified checkmark — shown inline next to username when user.is_verified is true.
 * Small blue circle with a white tick, similar to social platform conventions.
 */
function VerifiedBadge({ size = 14 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      title="Verified"
      aria-label="Verified account"
      className="flex-shrink-0 inline-block"
    >
      <circle cx="8" cy="8" r="8" fill="#3B82F6" />
      <path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export { VerifiedBadge }

export default function Avatar({ user, size = 32, showName = false, showTag = false, linkable = true }) {
  if (!user) return null
  const initials = (user.username ?? 'U').slice(0, 2).toUpperCase()
  const px = `${size}px`

  const img = user.avatar_url
    ? <img src={user.avatar_url} alt={user.username} style={{ width: px, height: px }} className="rounded-full object-cover flex-shrink-0" />
    : <div style={{ width: px, height: px, fontSize: size * 0.35 }} className="rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-white font-bold flex-shrink-0">{initials}</div>

  const gameTag = showTag && user.game_tag ? <span className="text-xs text-muted">#{user.game_tag}</span> : null

  const inner = (
    <span className="inline-flex items-center gap-2 min-w-0">
      {img}
      {showName && (
        <span className="flex flex-col min-w-0">
          <span className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white truncate">{user.username}</span>
            {user.is_verified && <VerifiedBadge size={13} />}
          </span>
          {gameTag}
        </span>
      )}
    </span>
  )

  if (linkable && user.username) {
    return <Link to={`/profile/${user.username}`} className="hover:opacity-80 transition-opacity">{inner}</Link>
  }
  return inner
}
