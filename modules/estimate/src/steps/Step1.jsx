import { useStore } from '@ecorean/shared/store'
import Card from '@ecorean/shared/ui/Card'
import Button from '@ecorean/shared/ui/Button'

const BUILD_TYPES = [
  { id: 'apt',    label: '아파트',   icon: '🏢' },
  { id: 'villa',  label: '빌라/다세대', icon: '🏘' },
  { id: 'house',  label: '단독주택', icon: '🏠' },
  { id: 'office', label: '사무실',   icon: '🏗' },
  { id: 'retail', label: '상업공간', icon: '🏪' },
  { id: 'etc',    label: '기타',     icon: '📐' },
]

export default function Step1({ onNext }) {
  const buildType = useStore(s => s.buildType)
  const buildAge = useStore(s => s.buildAge)
  const floorLevel = useStore(s => s.floorLevel)
  const hasElev = useStore(s => s.hasElev)
  const residentDuring = useStore(s => s.residentDuring)
  const region = useStore(s => s.region)
  const setField = useStore(s => s.setField)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        건물 기본 정보
      </h2>

      {/* 건물 유형 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 10 }}>
          건물 유형
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {BUILD_TYPES.map(bt => (
            <Card
              key={bt.id}
              onClick={() => setField('buildType', bt.id)}
              style={{
                textAlign: 'center', padding: '16px 12px',
                borderColor: buildType === bt.id ? 'var(--gold)' : undefined,
                boxShadow: buildType === bt.id ? 'var(--shadow-gold)' : undefined,
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: 6 }}>{bt.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: buildType === bt.id ? 'var(--gold-bright)' : 'var(--text)' }}>
                {bt.label}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 건물 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="건물 연식 (년)">
          <input type="number" value={buildAge} onChange={e => setField('buildAge', +e.target.value)}
            style={inputStyle} min={0} max={100} />
        </Field>
        <Field label="층수">
          <input type="number" value={floorLevel} onChange={e => setField('floorLevel', +e.target.value)}
            style={inputStyle} min={1} max={50} />
        </Field>
        <Field label="���역 계수">
          <select value={region} onChange={e => setField('region', +e.target.value)} style={inputStyle}>
            <option value={1.0}>서울 외곽·경기 (×1.0)</option>
            <option value={1.05}>서울 일반 (×1.05)</option>
            <option value={1.10}>강남·서초·송파 (×1.10)</option>
            <option value={1.15}>용산·마포·성동 (×1.15)</option>
          </select>
        </Field>
        <Field label="옵션">
          <div style={{ display: 'flex', gap: 16, paddingTop: 8 }}>
            <Check label="엘리베이터" checked={hasElev} onChange={v => setField('hasElev', v)} />
            <Check label="입주 중 공사" checked={residentDuring} onChange={v => setField('residentDuring', v)} />
          </div>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onNext}>다음 단계 →</Button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '12px' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
      {label}
    </label>
  )
}

const inputStyle = {
  width: '100%', background: 'var(--raised)', border: '1px solid var(--border3)',
  borderRadius: 'var(--r)', padding: '8px 12px', color: 'var(--text)',
  fontSize: '13px', outline: 'none',
}
