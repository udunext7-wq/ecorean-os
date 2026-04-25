import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const fmt = n => n >= 100000000 ? (n / 100000000).toFixed(1) + '억' : Math.round(n / 10000) + '만원'

export default function ProjectsModule() {
  const projects = useStore(s => s.projects)
  const deleteProject = useStore(s => s.deleteProject)
  const loadProject = useStore(s => s.loadProject)

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        저장된 프로젝트
      </h2>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--dim)' }}>
          저장된 프로젝트 없음<br />
          <span style={{ fontSize: '12px' }}>견적 마법사 → 저장 버튼</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {projects.map(p => (
            <Card key={p.id}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: 10 }}>
                {p.spaces?.length || 0}개 공간 | {new Date(p.createdAt).toLocaleDateString()}
              </div>
              {p.result && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--gold-bright)', marginBottom: 10 }}>
                  {fmt(p.result.final)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => loadProject(p)} style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}>불러오기</Button>
                <Button variant="danger" onClick={() => { if (confirm('삭제?')) deleteProject(p.id) }} style={{ padding: '6px 10px', fontSize: '12px' }}>삭제</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
