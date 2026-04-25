export default function Card({ children, style, className = '', hover = true, onClick }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--raised)',
        border: '1px solid var(--border3)',
        borderRadius: 'var(--rl)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
        transition: hover ? 'all .3s cubic-bezier(0.23,1,0.32,1)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)'
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.borderColor = 'var(--border3)'
        e.currentTarget.style.boxShadow = ''
      } : undefined}
    >
      {children}
    </div>
  )
}
