import { useEffect, useRef } from 'react'
import { useStore } from '@ecorean/shared/store'

const TYPE_COLORS = {
  AUTO_INCLUDE: '#5AADFF',
  WARN_CONDITIONAL: '#FFAA44',
  FORCED: '#FF5574',
  pending: '#666680',
}

export default function OntologyModule() {
  const canvasRef = useRef(null)
  const rules = useStore(s => s.ontologyRules)

  useEffect(() => {
    if (!canvasRef.current) return
    renderDandelion(canvasRef.current, rules)
  }, [rules])

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)', marginBottom: 16 }}>
        온톨로지 규칙 시각화
      </h2>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--dim)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {type}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--dim)' }}>
          {rules.length}개 규칙
        </div>
      </div>

      <div style={{ flex: 1, background: 'var(--raised)', borderRadius: 'var(--rl)', border: '1px solid var(--border3)', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

function renderDandelion(canvas, rules) {
  const ctx = canvas.getContext('2d')
  const W = canvas.offsetWidth || 900
  const H = canvas.offsetHeight || 500
  canvas.width = W
  canvas.height = H

  ctx.clearRect(0, 0, W, H)
  if (!rules.length) {
    ctx.fillStyle = 'rgba(201,168,76,0.3)'
    ctx.font = '13px JetBrains Mono'
    ctx.textAlign = 'center'
    ctx.fillText('온톨로지 규칙 없음', W / 2, H / 2)
    return
  }

  const cx = W / 2, cy = H / 2
  const R = Math.min(W, H) * 0.38
  const centerR = 28

  // Center node
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerR)
  grad.addColorStop(0, 'rgba(201,168,76,0.5)')
  grad.addColorStop(1, 'rgba(201,168,76,0.1)')
  ctx.beginPath(); ctx.arc(cx, cy, centerR, 0, Math.PI * 2)
  ctx.fillStyle = grad; ctx.fill()
  ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = '#F0C04A'; ctx.font = 'bold 10px JetBrains Mono'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('ONTOLOGY', cx, cy)

  // Rule nodes
  const total = rules.length
  rules.slice(0, 60).forEach((rule, i) => {
    const angle = (i / Math.min(total, 60)) * Math.PI * 2 - Math.PI / 2
    const r = R * (0.65 + (i % 3) * 0.1)
    const nx = cx + Math.cos(angle) * r
    const ny = cy + Math.sin(angle) * r
    const color = TYPE_COLORS[rule.type] || TYPE_COLORS.pending
    const nr = 7

    // Bezier stem
    const cp1x = cx + Math.cos(angle) * R * 0.35
    const cp1y = cy + Math.sin(angle) * R * 0.35
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * centerR, cy + Math.sin(angle) * centerR)
    ctx.bezierCurveTo(cp1x, cp1y, (cp1x + nx) / 2, (cp1y + ny) / 2, nx, ny)
    ctx.strokeStyle = color + '40'; ctx.lineWidth = 1; ctx.stroke()

    // Node
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2)
    ctx.fillStyle = color + '30'; ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke()

    // Label
    ctx.fillStyle = color + 'CC'; ctx.font = '8px JetBrains Mono'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const labelX = cx + Math.cos(angle) * (r + 18)
    const labelY = cy + Math.sin(angle) * (r + 14)
    ctx.fillText(rule.id || rule.trigger || 'R' + i, labelX, labelY)
  })
}
