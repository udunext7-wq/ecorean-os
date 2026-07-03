import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const PIPE_OPTIONS = [
  { value: 'pb',         label: 'PB관 (양호)', color: 'var(--green)' },
  { value: 'copper',     label: '동관 (양호)', color: 'var(--green)' },
  { value: 'pvc',        label: 'PVC관 (주의)', color: 'var(--orange)' },
  { value: 'galvanized', label: '아연도금관 (불량 — 교체 필수)', color: 'var(--red)' },
]

const FLOOR_OPTIONS = [
  { value: 'good',  label: '양호', color: 'var(--green)' },
  { value: 'fair',  label: '주의', color: 'var(--orange)' },
  { value: 'poor',  label: '불량', color: 'var(--red)' },
]

export default function Step3({ onNext, onPrev }) {
  const state = useStore()
  const setField = useStore(s => s.setField)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        기존 상태
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <h3 style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>배관 상태</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PIPE_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--r)', border: `1px solid ${state.pipeMaterial === opt.value ? opt.color : 'var(--border3)'}`, background: state.pipeMaterial === opt.value ? 'var(--raised)' : 'transparent' }}>
                <input type="radio" name="pipeMat" value={opt.value} checked={state.pipeMaterial === opt.value} onChange={() => setField('pipeMaterial', opt.value)} style={{ accentColor: opt.color }} />
                <span style={{ fontSize: '12px', color: state.pipeMaterial === opt.value ? opt.color : 'var(--text2)' }}>{opt.label}</span>
              </label>
            ))}
          </div>
          {state.pipeMaterial === 'galvanized' && (
            <div style={{ marginTop: 12, padding: '10px', background: 'rgba(255,85,116,.1)', border: '1px solid var(--red)', borderRadius: 'var(--r)', color: 'var(--red)', fontSize: '12px', animation: 'shake .3s' }}>
              ⚠ 아연도금관 — 배관 전면 교체가 법적으로 권장됩니다
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>바닥 레벨 상태</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {FLOOR_OPTIONS.map(opt => (
              <label key={opt.value} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '12px', borderRadius: 'var(--r)', border: `1px solid ${state.floorLevel2 === opt.value ? opt.color : 'var(--border3)'}`, background: state.floorLevel2 === opt.value ? 'var(--raised)' : 'transparent', textAlign: 'center' }}>
                <input type="radio" name="floorLvl" value={opt.value} checked={state.floorLevel2 === opt.value} onChange={() => setField('floorLevel2', opt.value)} style={{ accentColor: opt.color }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: state.floorLevel2 === opt.value ? opt.color : 'var(--text2)' }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>추가 확인 사항</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Check label="석면 의심 (1985년 이전 건물)" checked={state.hasAsbestos} onChange={v => setField('hasAsbestos', v)} warn />
            <Check label="누수 이력 있음" checked={state.hasLeak} onChange={v => setField('hasLeak', v)} />
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext}>다음 단계 →</Button>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}`}</style>
    </div>
  )
}

function Check({ label, checked, onChange, warn }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--r)', border: `1px solid ${checked && warn ? 'var(--red)' : 'var(--border3)'}`, background: checked && warn ? 'rgba(255,85,116,.05)' : 'transparent' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: warn ? 'var(--red)' : 'var(--gold)', width: 14, height: 14 }} />
      <span style={{ fontSize: '12px', color: checked && warn ? 'var(--red)' : 'var(--text2)' }}>{label}</span>
    </label>
  )
}
