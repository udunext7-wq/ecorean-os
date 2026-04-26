import { useEffect } from 'react'
import { useStore } from '@ecorean/shared/store'
import { calculateEstimate } from '@ecorean/shared/engine'
import { runDiagnostics } from '@ecorean/shared/engine/diagnostics'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const fmt = n => n >= 100000000 ? (n / 100000000).toFixed(1) + '억원' : Math.round(n / 10000) + '만원'
const ff = n => '₩' + Math.round(n).toLocaleString()

const CAT_COLORS = {
  '사전공정': '#888', '방수': '#5AADFF', '미장': '#B8A98A', '타일': '#F0C04A',
  '목공': '#A78BFA', '창호': '#5DDDA0', '도어': '#5DDDA0', '도장': '#FFAA44',
  '도배': '#FFAA44', '바닥': '#C9A84C', '설비': '#FF5574', '배관': '#FF7755',
  '전기': '#FFD700', '가구': '#A78BFA', '욕실': '#5AADFF', '발코니': '#5DDDA0',
  '준공': '#888',
}

const DIAG_COLOR = { error: 'var(--red)', warn: 'var(--orange)', info: 'var(--blue)', ok: 'var(--green)' }

export default function Step6({ onPrev }) {
  const state = useStore()
  const costItems = useStore(s => s.costItems)
  const setResult = useStore(s => s.setResult)
  const result = useStore(s => s.result)

  useEffect(() => {
    if (Object.keys(costItems).length === 0) return
    const r = calculateEstimate(state, costItems)
    setResult(r)
  }, [
    state.spaces, state.scope, state.grades, state.globalMul,
    state.buildAge, state.floorLevel, state.hasElev,
    state.residentDuring, state.region, costItems,
  ])

  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--dim)' }}>
        {Object.keys(costItems).length === 0 ? 'DB 로딩 중...' : '공간을 추가하세요'}
      </div>
    )
  }

  const { lines, totalSupply, contractAmount, finalAmount, duration, totals } = result
  const diags = runDiagnostics(lines, state, totals)

  // 카테고리별 그룹화
  const catGroups = {}
  lines.forEach(l => {
    if (!catGroups[l.category]) catGroups[l.category] = []
    catGroups[l.category].push(l)
  })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 최종 금액 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: '11px', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>
          최종 견적 금액
        </div>
        <div style={{
          fontFamily: 'var(--font-head)', fontSize: '48px', fontWeight: 700,
          background: 'linear-gradient(135deg, var(--gold), var(--gold-bright))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.1,
        }}>
          {fmt(finalAmount)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--dim)', marginTop: 4 }}>VAT 포함</div>
      </div>

      {/* KPI 4종 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <KPICard label="공급가" value={fmt(totalSupply)} />
        <KPICard label="도급금액" value={fmt(contractAmount)} />
        <KPICard label="㎡단가" value={totals.fa > 0 ? ff(Math.round(finalAmount / totals.fa)) + '/㎡' : '—'} />
        <KPICard label="공사기간" value={duration + '일'} />
      </div>

      {/* 진단 */}
      {diags.length > 0 && (
        <Card style={{ marginBottom: 20, padding: '12px 16px' }}>
          <h3 style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 10 }}>진단</h3>
          {diags.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: '12px', color: DIAG_COLOR[d.type] }}>
              <span>[{d.code}]</span><span>{d.message}</span>
            </div>
          ))}
        </Card>
      )}

      {/* 공정 테이블 */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--raised)', borderBottom: '1px solid var(--border3)' }}>
              {['공정명', '분류', '수량', '단위', '공급가'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === '공급가' ? 'right' : 'left', color: 'var(--dim)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(catGroups).map(([cat, items]) => [
              <tr key={'cat-' + cat} style={{ background: 'rgba(201,168,76,.04)' }}>
                <td colSpan={5} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: CAT_COLORS[cat] || 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {cat}
                </td>
              </tr>,
              ...items.map((l, i) => (
                <tr key={l.id + i} style={{ borderBottom: '1px solid var(--border3)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text)' }}>
                    {l.name}
                    {l.auto && <span style={{ marginLeft: 6, fontSize: '10px', background: 'rgba(93,221,160,.15)', color: 'var(--green)', padding: '1px 5px', borderRadius: 3 }}>자동</span>}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--dim)', fontSize: '11px' }}>{cat}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{l.qty}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--dim)', fontSize: '11px' }}>{l.unit}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text)' }}>
                    {ff(l.supplyPrice)}
                  </td>
                </tr>
              )),
            ])}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--raised)', borderTop: '2px solid var(--border)' }}>
              <td colSpan={4} style={{ padding: '12px', fontWeight: 700, color: 'var(--gold)' }}>합계 (공급가)</td>
              <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700, color: 'var(--gold-bright)', fontSize: '14px' }}>{ff(totalSupply)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={() => window.print()}>인쇄</Button>
          <Button onClick={() => {
            const s = useStore.getState()
            s.saveProject({
              id: 'proj_' + Date.now(),
              name: '견적_' + new Date().toLocaleDateString(),
              createdAt: new Date().toISOString(),
              buildType: s.buildType,
              buildAge: s.buildAge,
              floorLevel: s.floorLevel,
              spaces: s.spaces,
              scope: s.scope,
              grades: s.grades,
              result: s.result,
            })
            alert('프로젝트 저장 완료')
          }}>저장</Button>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value }) {
  return (
    <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--gold-bright)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--dim)', textTransform: 'uppercase' }}>{label}</div>
    </Card>
  )
}
