const STEPS = ['건물기본', '공간실측', '기존상태', '공사범위', '자재등급', '견적결과']

export default function StepBar({ current, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '12px 20px',
      background: 'var(--deep)', borderBottom: '1px solid var(--border3)',
      gap: 0, flexShrink: 0,
    }}>
      {STEPS.map((label, i) => {
        const active = i === current
        const done = i < current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div
              onClick={() => onChange?.(i)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', gap: 4,
              }}
            >
              <div style={{
                width: 28, height: 28,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                background: active ? 'var(--gold-bright)' : done ? 'var(--gold-dim)' : 'var(--raised)',
                border: active ? 'none' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                color: active ? '#000' : done ? 'var(--gold)' : 'var(--dim)',
                transition: 'all .3s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '10px', whiteSpace: 'nowrap',
                color: active ? 'var(--gold-bright)' : done ? 'var(--gold)' : 'var(--dim)',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
                background: done ? 'var(--gold-dim)' : 'var(--border3)',
                transition: 'background .3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
