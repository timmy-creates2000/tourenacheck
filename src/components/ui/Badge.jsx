export default function Badge({ children, color = 'purple', outline = false, className = '' }) {
  const colors = {
    purple: outline ? 'border border-purple-500 text-purple-400' : 'bg-purple-600/20 text-purple-300',
    amber: outline ? 'border border-amber-500 text-amber-400' : 'bg-amber-500/20 text-amber-300',
    green: outline ? 'border border-green-500 text-green-400' : 'bg-green-600/20 text-green-300',
    red: outline ? 'border border-red-500 text-red-400' : 'bg-red-600/20 text-red-300',
    blue: outline ? 'border border-blue-500 text-blue-400' : 'bg-blue-600/20 text-blue-300',
    gray: outline ? 'border border-gray-500 text-gray-400' : 'bg-gray-600/20 text-gray-300',
    teal: outline ? 'border border-teal-500 text-teal-400' : 'bg-teal-600/20 text-teal-300',
    gold: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.purple} ${className}`}>
      {children}
    </span>
  )
}
