export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-white/80">{label}</label>}
      <input
        className={`w-full bg-surface2 border ${error ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white placeholder-muted text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-white/80">{label}</label>}
      <textarea
        className={`w-full bg-surface2 border ${error ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white placeholder-muted text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Select({ label, error, hint, children, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-white/80">{label}</label>}
      <select
        className={`w-full bg-surface2 border ${error ? 'border-red-500' : 'border-white/10'} rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
