import { useStore } from '@ecorean/shared/store'
import Card from '@ecorean/shared/ui/Card'

const ROADMAP = [
  { count: 0,   label: '초기화',    desc: 'localStorage 데이터 수집 중', done: true },
  { count: 50,  label: '패턴 학습', desc: '공간 유형별 단가 편차 학습' },
  { count: 100, label: '제안 엔진', desc: '비용 이상값 경고 활성화' },
  { count: 500, label: '회귀 모델', desc: '지역·면적 기반 단가 예측' },
]

export default function AIModule() {
  const projects = useStore(s => s.projects)
  const cases = projects.filter(p => p.result)
  const dataCount = cases.length
  const activeStage = ROADMAP.reduce((last, s) => dataCount >= s.count ? s : last, ROADMAP[0])
  const accuracy = dataCount > 0 ? Math.min(95, 60 + dataCount * 0.5) : 0
  const nextStage = ROADMAP.find(s => s.count > dataCount)
  const progress = nextStage
    ? Math.round(((dataCount - activeStage.count) / (nextStage.count - activeStage.count)) * 100)
    : 100

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        AI 견적 엔진
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--gold-bright)' }}>{dataCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: 4 }}>학습 데이터 (완료 프로젝트)</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: dataCount > 0 ? 'var(--green)' : 'var(--dim)' }}>
            {dataCount > 0 ? accuracy.toFixed(1) + '%' : '—'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: 4 }}>예측 정확도 (추정)</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>{activeStage.label}</div>
          <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: 4 }}>현재 단계</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>활성화 로드맵</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROADMAP.map((stage, i) => {
            const isDone = dataCount >= stage.count
            const isActive = stage === activeStage
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? 'rgba(93,221,160,.2)' : 'var(--raised)',
                  border: `2px solid ${isDone ? 'var(--green)' : isActive ? 'var(--gold)' : 'var(--border3)'}`,
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: isDone ? 'var(--green)' : isActive ? 'var(--gold)' : 'var(--dim)',
                }}>
                  {isDone ? '✓' : stage.count}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isDone ? 'var(--text)' : isActive ? 'var(--gold)' : 'var(--dim)' }}>
                    {stage.label}
                    {isActive && <span style={{ marginLeft: 8, fontSize: '10px', color: 'var(--gold)', background: 'var(--gold2)', padding: '1px 6px', borderRadius: 3 }}>현재</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--dim)' }}>{stage.desc}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--dim)' }}>{stage.count}건</div>
              </div>
            )
          })}
        </div>
        {nextStage && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--dim)', marginBottom: 5 }}>
              <span>다음 단계까지 {nextStage.count - dataCount}건 필요</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg, var(--gold-dim), var(--gold-bright))', transition: 'width .5s' }} />
            </div>
          </div>
        )}
      </Card>

      {cases.length > 0 ? (
        <Card>
          <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>학습 데이터 목록</h3>
          {cases.slice(0, 10).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 10px', background: 'var(--raised)', borderRadius: 'var(--r)', marginBottom: 4 }}>
              <span style={{ color: 'var(--text2)' }}>{p.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                {p.result?.final ? '₩' + Math.round(p.result.final).toLocaleString() : '—'}
              </span>
              <span style={{ color: 'var(--dim)' }}>{p.spaces?.length || 0}개 공간</span>
            </div>
          ))}
        </Card>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dim)', fontSize: '12px' }}>
          완료된 프로젝트가 없습니다.<br />견적 마법사 → 저장 버튼으로 학습 데이터를 수집하세요.
        </div>
      )}
    </div>
  )
}
