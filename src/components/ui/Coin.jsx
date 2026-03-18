export default function Coin({ size = 16, className = '' }) {
  return (
    <img 
      src="/coin.svg" 
      alt="TC" 
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// Usage examples:
// <Coin size={20} /> - 20px coin
// <Coin size={24} className="mr-2" /> - 24px with margin
