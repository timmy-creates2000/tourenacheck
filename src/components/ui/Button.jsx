export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, loading, onClick, type = 'button', ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3 text-base' }
  const variants = {
    primary: 'bg-primary text-white hover:bg-purple-500 glow-purple',
    secondary: 'bg-surface2 text-white hover:bg-surface border border-white/10',
    accent: 'bg-accent text-black hover:bg-yellow-400 font-bold',
    ghost: 'text-white hover:bg-surface2',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
  }
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {loading ? <span className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : null}
      {children}
    </button>
  )
}
