import { useRef } from 'react'

function playDropSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(800, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
    filter.Q.value = 15
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
  } catch (e) {}
}

export default function Button({ children, onClick, variant = 'primary', disabled, style, className = '' }) {
  const btnRef = useRef(null)

  const handleClick = (e) => {
    playDropSound()
    // Ripple effect
    const btn = btnRef.current
    if (btn) {
      const ripple = document.createElement('span')
      const rect = btn.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      ripple.style.cssText = `
        position:absolute; border-radius:50%; pointer-events:none;
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size/2}px;
        top:${e.clientY - rect.top - size/2}px;
        background:rgba(201,168,76,0.3);
        animation:ripple .6s ease-out forwards;
      `
      btn.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }
    onClick?.(e)
  }

  const base = {
    position: 'relative', overflow: 'hidden',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--rx)',
    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
    transition: 'all .3s cubic-bezier(0.23,1,0.32,1)',
    padding: '10px 20px',
    opacity: disabled ? 0.5 : 1,
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--gold-dim), var(--gold-bright))',
      color: '#000',
      boxShadow: '0 4px 16px var(--gold-glow)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--gold)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'rgba(255,85,116,0.15)',
      color: 'var(--red)',
      border: '1px solid rgba(255,85,116,0.3)',
    },
  }

  return (
    <button
      ref={btnRef}
      disabled={disabled}
      onClick={disabled ? undefined : handleClick}
      className={className}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
      <style>{`@keyframes ripple{to{transform:scale(3);opacity:0}}`}</style>
    </button>
  )
}
