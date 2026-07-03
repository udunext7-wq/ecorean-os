import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const STATUS_LABEL = { pending: '대기 중', approved: '승인', rejected: '반려' }
const STATUS_COLOR = { pending: 'var(--orange)', approved: 'var(--green)', rejected: 'var(--red)' }

export default function ApprovalModule() {
  const reqs = useStore(s => s.approvalReqs)
  const log = useStore(s => s.approvalLog)
  const approveReq = useStore(s => s.approveReq)

  const pending = reqs.filter(r => r.approvalStatus === 'pending')

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 20 }}>
        승인함
      </h2>

      <div style={{ marginBottom: 8, fontSize: '12px', color: 'var(--dim)' }}>
        대기 {pending.length}건 / 전체 {reqs.length}건
      </div>

      {reqs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--dim)' }}>승인 요청이 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reqs.map(r => (
            <Card key={r.requestId} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title || r.requestId}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.note}</div>
                  <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: 4 }}>
                    요청: {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'} | {r.requestedBy || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: 4, background: STATUS_COLOR[r.approvalStatus] + '22', color: STATUS_COLOR[r.approvalStatus] }}>
                    {STATUS_LABEL[r.approvalStatus] || r.approvalStatus}
                  </span>
                  {r.approvalStatus === 'pending' && (
                    <>
                      <Button onClick={() => approveReq(r.requestId, true, '승인')} style={{ padding: '5px 12px', fontSize: '11px' }}>승인</Button>
                      <Button variant="danger" onClick={() => approveReq(r.requestId, false, '반려')} style={{ padding: '5px 12px', fontSize: '11px' }}>반려</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: '12px', color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 12 }}>처리 이력</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {log.slice(0, 20).map(l => (
              <div key={l.approvalId} style={{ fontSize: '11px', color: 'var(--dim)', padding: '6px 12px', background: 'var(--raised)', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{l.requestId}</span>
                <span style={{ color: l.actionType === 'approved' ? 'var(--green)' : 'var(--red)' }}>{l.actionType}</span>
                <span>{new Date(l.approvedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
