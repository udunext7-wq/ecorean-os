import { useEffect, useRef, useState } from 'react'
import { useStore } from '@ecorean/shared/store'
import { bus, EVENTS } from '@ecorean/shared/EventBus'

const MM2PX = 0.06
const PX2MM = 1 / MM2PX

const TOOLS = [
  { id: 'select', label: '선택', icon: '↖' },
  { id: 'room',   label: '공간', icon: '□' },
  { id: 'door',   label: '문',   icon: '🚪' },
  { id: 'window', label: '창',   icon: '⬜' },
]

export default function CADEditor() {
  const canvasRef = useRef(null)
  const fcRef = useRef(null)
  const wrapRef = useRef(null)
  const [tool, setTool] = useState('select')
  const [status, setStatus] = useState('공간 도구를 선택하고 캔버스에 드래그하세요')
  const [spaceCount, setSpaceCount] = useState(0)
  const setSpaces = useStore(s => s.setSpaces)
  const existingSpaces = useStore(s => s.spaces)

  useEffect(() => {
    if (!canvasRef.current || !window.fabric) return
    initFabric()
    return () => { if (fcRef.current) fcRef.current.dispose() }
  }, [])

  function initFabric() {
    const wrap = wrapRef.current
    const w = wrap.clientWidth || 800
    const h = wrap.clientHeight || 500

    const fc = new window.fabric.Canvas(canvasRef.current, {
      width: w, height: h,
      backgroundColor: '#0D0D1A',
      selection: true,
    })
    fcRef.current = fc

    // Grid
    fc._renderBackground = function (ctx) {
      const grid = 20
      ctx.strokeStyle = 'rgba(201,168,76,0.08)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < this.width; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke()
      }
      for (let y = 0; y < this.height; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke()
      }
    }
    fc.renderAll()

    // Mouse wheel zoom
    fc.on('mouse:wheel', opt => {
      const delta = opt.e.deltaY
      let zoom = fc.getZoom()
      zoom *= 0.999 ** delta
      zoom = Math.max(0.2, Math.min(5, zoom))
      fc.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
      opt.e.preventDefault(); opt.e.stopPropagation()
    })

    // Middle-click pan
    let isPanning = false, lastPt = null
    fc.on('mouse:down', opt => {
      if (opt.e.button === 1) {
        isPanning = true
        lastPt = { x: opt.e.clientX, y: opt.e.clientY }
        opt.e.preventDefault()
      }
    })
    fc.on('mouse:move', opt => {
      if (!isPanning || !lastPt) return
      const dx = opt.e.clientX - lastPt.x
      const dy = opt.e.clientY - lastPt.y
      fc.relativePan({ x: dx, y: dy })
      lastPt = { x: opt.e.clientX, y: opt.e.clientY }
    })
    fc.on('mouse:up', () => { isPanning = false; lastPt = null })

    // Load existing spaces from store
    if (existingSpaces.length > 0) {
      existingSpaces.forEach(sp => {
        createRoom(fc, sp.id, sp.name, sp.width * MM2PX, sp.length * MM2PX)
      })
      setSpaceCount(existingSpaces.length)
    }

    // Resize
    const ro = new ResizeObserver(() => {
      if (!wrap) return
      fc.setWidth(wrap.clientWidth)
      fc.setHeight(wrap.clientHeight)
      fc.renderAll()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }

  function createRoom(fc, id, name, wPx, hPx) {
    const rect = new window.fabric.Rect({
      width: wPx, height: hPx,
      fill: 'rgba(93,221,160,0.1)', stroke: '#5DDDA0', strokeWidth: 1.5,
      selectable: true,
    })
    const label = new window.fabric.Text(name, {
      fontSize: 11, fill: '#EDE5D5', fontFamily: 'JetBrains Mono',
      originX: 'center', originY: 'center', left: wPx / 2, top: hPx / 2,
    })
    const area = new window.fabric.Text(
      ((wPx * PX2MM / 1000) * (hPx * PX2MM / 1000)).toFixed(2) + '㎡', {
        fontSize: 9, fill: '#C9A84C', fontFamily: 'JetBrains Mono',
        originX: 'center', originY: 'center', left: wPx / 2, top: hPx / 2 + 14,
      }
    )
    const group = new window.fabric.Group([rect, label, area], {
      left: 20 + Math.random() * 200, top: 20 + Math.random() * 100,
    })
    group.spaceId = id
    group.spaceName = name
    fc.add(group)
    fc.renderAll()
  }

  function syncToStore(fc) {
    const spaces = []
    fc.getObjects('group').forEach(g => {
      if (!g.spaceId) return
      const rect = g.getObjects('rect')[0]
      if (!rect) return
      const wMm = Math.round(rect.width * g.scaleX * PX2MM)
      const hMm = Math.round(rect.height * g.scaleY * PX2MM)
      spaces.push({
        id: g.spaceId,
        name: g.spaceName || g.spaceId,
        type: 'living',
        width: wMm, length: hMm, height: 2400,
        windows: [], doors: [{ type: '여닫이', w: 900, h: 2100 }],
        corners: 4, wet: false,
      })
    })
    setSpaces(spaces)
    setSpaceCount(spaces.length)
    bus.emit(EVENTS.SPACES_CHANGE, spaces)
    setStatus(`${spaces.length}개 공간 동기화 완료`)
  }

  const addTestRoom = () => {
    const fc = fcRef.current
    if (!fc || !window.fabric) return
    const id = 'room_' + Date.now()
    createRoom(fc, id, '공간 ' + (spaceCount + 1), 3000 * MM2PX, 4000 * MM2PX)
    setSpaceCount(c => c + 1)
    syncToStore(fc)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--surface)' }}>
      {/* 툴바 */}
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', gap: 4, background: 'var(--deep)', borderRight: '1px solid var(--border3)' }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label} style={{
            width: 36, height: 36, border: 'none', borderRadius: 'var(--r)',
            background: tool === t.id ? 'var(--gold2)' : 'transparent',
            color: tool === t.id ? 'var(--gold-bright)' : 'var(--dim)',
            cursor: 'pointer', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {t.icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={addTestRoom} title="공간 추가" style={{
          width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--r)',
          background: 'var(--gold2)', color: 'var(--gold-bright)', cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
        <button onClick={() => syncToStore(fcRef.current)} title="동기화" style={{
          width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--r)',
          background: 'transparent', color: 'var(--green)', cursor: 'pointer', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>⟳</button>
      </div>

      {/* 캔버스 영역 */}
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} />
        <div style={{
          position: 'absolute', bottom: 8, left: 8, fontSize: '10px',
          color: 'rgba(201,168,76,.6)', fontFamily: 'JetBrains Mono', pointerEvents: 'none',
        }}>
          {status} | {spaceCount}개 공간
        </div>
      </div>
    </div>
  )
}
