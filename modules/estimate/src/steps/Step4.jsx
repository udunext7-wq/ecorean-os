import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const SCOPE_GROUPS = [
  {
    cat: '창호·도어', items: [
      { key: 'winReplace', label: '창호 교체 (시스템 창호)' },
      { key: 'winMid',     label: '중문 설치' },
      { key: 'winScreen',  label: '방충망 교체' },
      { key: 'doorReplace',label: '실내 도어 교체' },
      { key: 'doorFront',  label: '현관문 교체' },
    ],
  },
  {
    cat: '미장·바닥', items: [
      { key: 'lvFloor',    label: '바닥재 교체' },
      { key: 'lvMold',     label: '몰딩 교체' },
    ],
  },
  {
    cat: '벽·천장', items: [
      { key: 'lvWp',       label: '도배' },
      { key: 'lvPaint',    label: '수성 페인트' },
      { key: 'lvLgs',      label: 'LGS 경량 칸막이' },
      { key: 'lvIndirect', label: '간접등박스' },
      { key: 'lvWardrobe', label: '붙박이장' },
    ],
  },
  {
    cat: '욕실', items: [
      { key: 'balWp',      label: '발코니 방수' },
    ],
  },
  {
    cat: '주방', items: [
      { key: 'ktCab',  label: '주방가구 (하부장)' },
      { key: 'ktTop',  label: '상판 교체' },
      { key: 'ktHood', label: '후드 교체' },
      { key: 'ktDw',   label: '식기세척기' },
      { key: 'ktOven', label: '빌트인 오븐' },
      { key: 'ktTile', label: '주방 타일' },
      { key: 'ktPlb',  label: '주방 배관' },
    ],
  },
  {
    cat: '설비', items: [
      { key: 'plbPipe',   label: '배관 교체' },
      { key: 'plbBoiler', label: '보일러 교체' },
      { key: 'plbHeat',   label: '난방 배관 점검' },
      { key: 'eleWire',   label: '전기 배선 교체' },
      { key: 'elePanel',  label: '분전반 교체' },
      { key: 'eleOutlet', label: '콘센트·스위치' },
      { key: 'eleLight',  label: '다운라이트 설치' },
      { key: 'eleIndirect', label: '간접조명 배선' },
    ],
  },
  {
    cat: '발코니', items: [
      { key: 'balExpand', label: '발코니 확장' },
      { key: 'balInsul',  label: '발코니 단열' },
      { key: 'balFloor',  label: '발코니 바닥 타일' },
    ],
  },
]

export default function Step4({ onNext, onPrev }) {
  const scope = useStore(s => s.scope)
  const setScope = useStore(s => s.setScope)
  const checkedCount = Object.values(scope).filter(Boolean).length

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)' }}>공사 범위</h2>
        <div style={{ fontSize: '12px', color: 'var(--dim)' }}>{checkedCount}개 선택</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {SCOPE_GROUPS.map(group => (
          <Card key={group.cat} style={{ padding: '14px 16px' }}>
            <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
              {group.cat}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(item => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={!!scope[item.key]}
                    onChange={e => setScope(item.key, e.target.checked)}
                    style={{ accentColor: 'var(--gold)', width: 13, height: 13 }}
                  />
                  <span style={{ color: scope[item.key] ? 'var(--text)' : 'var(--text2)' }}>{item.label}</span>
                  {scope[item.key] && <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--gold2)', color: 'var(--gold)', padding: '1px 6px', borderRadius: 4 }}>선택</span>}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext}>다음 단계 →</Button>
      </div>
    </div>
  )
}
