export default function Card({ children, className = '', hover = false, glow = false }) {
  return (
    <div className={`bg-surface rounded-xl border border-white/[0.08] ${hover ? 'hover:bg-surface2 transition-colors duration-200 cursor-pointer' : ''} ${glow ? 'glow-purple' : ''} ${className}`}>
      {children}
    </div>
  )
}
