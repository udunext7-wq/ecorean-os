import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const GRADE_PRESETS = [
  {
    id: 'standard', label: '일반', mul: 1.0, color: 'var(--text2)',
    desc: '국내 중가 자재 기준',
  },
  {
    id: 'premium', label: '고급', mul: 1.3, color: 'var(--gold)',
    desc: '수입 프리미엄 자재 기준',
  },
  {
    id: 'luxury', label: '럭셔리', mul: 1.8, color: 'var(--gold-bright)',
    desc: '최고급 브랜드 자재 기준',
  },
]

const GRADE_DETAILS = [
  { key: 'bt',  label: '욕실 타일',  options: [['domestic','국내산'],['import','수입산'],['luxury','럭셔리']] },
  { key: 'fl',  label: '바닥재',     options: [['hb','합판'],['wb','강마루'],['wood','원목']] },
  { key: 'wp',  label: '도배',       options: [['paper','합지'],['silk','실크'],['wide','광폭실크']] },
  { key: 'win', label: '창호',       options: [['double','이중창'],['triple','삼중창'],['loe','로이삼중']] },
  { key: 'kit', label: '주방가구',   options: [['standard','일반'],['premium','프리미엄'],['luxury','럭셔리']] },
  { key: 'dr',  label: '실내도어',   options: [['abs','ABS'],['mdf','MDF'],['wood','원목']] },
  { key: 'fix', label: '욕실위생기기', options: [['standard','일반'],['premium','프리미엄'],['luxury','럭셔리']] },
]

export default function Step5({ onNext, onPrev }) {
  const globalMul = useStore(s => s.globalMul)
  const grades = useStore(s => s.grades)
  const setField = useStore(s => s.setField)
  const setGrade = useStore(s => s.setGrade)

  const activePreset = GRADE_PRESETS.find(p => Math.abs(p.mul - globalMul) < 0.01)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        자재 등급
      </h2>

      {/* 전체 등급 프리셋 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
        {GRADE_PRESETS.map(p => (
          <Card
            key={p.id}
            onClick={() => setField('globalMul', p.mul)}
            style={{
              textAlign: 'center', padding: '20px 16px',
              borderColor: activePreset?.id === p.id ? p.color : undefined,
              boxShadow: activePreset?.id === p.id ? `0 0 20px ${p.color}40` : undefined,
            }}
          >
            <div style={{ fontSize: '22px', fontFamily: 'var(--font-head)', fontWeight: 700, color: p.color, marginBottom: 4 }}>
              {p.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--dim)' }}>{p.desc}</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '12px', color: p.color }}>×{p.mul}</div>
          </Card>
        ))}
      </div>

      {/* 개별 등급 */}
      <Card>
        <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>
          개별 자재 등급
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {GRADE_DETAILS.map(item => (
            <div key={item.key}>
              <label style={{ fontSize: '11px', color: 'var(--dim)', display: 'block', marginBottom: 5 }}>{item.label}</label>
              <select
                value={grades[item.key] || item.options[0][0]}
                onChange={e => setGrade(item.key, e.target.value)}
                style={{
                  width: '100%', background: 'var(--raised)', border: '1px solid var(--border3)',
                  borderRadius: 'var(--r)', padding: '7px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none',
                }}
              >
                {item.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext}>견적 계산 →</Button>
      </div>
    </div>
  )
}
