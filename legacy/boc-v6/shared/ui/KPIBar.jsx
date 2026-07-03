import { useStore } from '../store/index.ts'

const fmt = n => n >= 100000000 ? (n / 100000000).toFixed(1) + '억' : Math.round(n / 10000) + '만원'

function KPIItem({ label, value, highlight, pulse }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 18px', borderRight: '1px solid var(--border3)',
      minWidth: 90,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700,
        color: highlight ? 'var(--gold-bright)' : 'var(--text)',
        position: 'relative',
      }}>
        {value}
        {pulse && (
          <span style={{
            position: 'absolute', top: 0, right: -8, width: 6, height: 6,
            borderRadius: '50%', background: 'var(--red)',
            animation: 'pulse 1.5s infinite',
          }} />
        )}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function KPIBar() {
  const result = useStore(s => s.result)
  const projects = useStore(s => s.projects)
  const approvalReqs = useStore(s => s.approvalReqs)
  const pendingCount = approvalReqs.filter(r => r.approvalStatus === 'pending').length

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--deep)', borderBottom: '1px solid var(--border3)',
      padding: '8px 16px', gap: 0, height: 52, flexShrink: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 700,
        color: 'var(--gold)', marginRight: 20, whiteSpace: 'nowrap',
        letterSpacing: '0.08em',
      }}>
        ECOREAN BOC
      </div>

      <KPIItem label="공급가"   value={result ? fmt(result.totalSupply)    : '—'} />
      <KPIItem label="도급"     value={result ? fmt(result.contractAmount) : '—'} />
      <KPIItem label="최종합계" value={result ? fmt(result.finalAmount)    : '—'} highlight />
      <KPIItem label="㎡단가"   value={result && result.totals.fa > 0 ? Math.round(result.finalAmount / result.totals.fa).toLocaleString() + '/㎡' : '—'} />
      <KPIItem label="평단가"   value={result && result.totals.fa > 0 ? fmt(result.finalAmount / (result.totals.fa / 3.306)) + '/평' : '—'} />

      <div style={{ flex: 1 }} />

      <KPIItem label="프로젝트" value={projects.length} />
      <KPIItem label="승인대기" value={pendingCount} pulse />

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
