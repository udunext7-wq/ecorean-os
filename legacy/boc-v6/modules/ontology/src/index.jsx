import { useEffect, useRef, useState } from 'react'
import { useStore } from '@ecorean/shared/store'
import * as THREE from 'three'

const NODE_COLORS = {
  Core:         0xC9A84C,
  OntologyRule: 0xF0C04A,
  Process:      0x5AADFF,
  Material:     0x5DDDA0,
  Brand:        0xFF8844,
  Defect:       0xFF5564,
  Case:         0xCC88FF,
  LaborCrew:    0xFFAA44,
  Risk:         0xFF5574,
  default:      0x888899,
}

const REL_COLORS = {
  TRIGGERS:     0xC9A84C,
  PRECEDES:     0xFFFFFF,
  DEPENDS_ON:   0x666680,
  AFFECTS_COST: 0xFF5574,
  default:      0x444466,
}

export default function OntologyModule() {
  const mountRef = useRef(null)
  const threeRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [stats, setStats] = useState({ nodes: 0, rels: 0 })

  useEffect(() => {
    if (!mountRef.current) return
    const three = initScene(mountRef.current, setHoveredNode, setStats)
    threeRef.current = three
    return () => three.dispose()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#04040A', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(201,168,76,.15)', flexShrink: 0, zIndex: 10 }}>
        <h2 style={{ fontFamily: 'serif', fontSize: '18px', color: '#C9A84C', margin: 0 }}>
          온톨로지 3D 그래프
        </h2>
        <div style={{ display: 'flex', gap: 12, fontSize: '10px', color: '#666680' }}>
          {Object.entries(NODE_COLORS).filter(([k]) => k !== 'default').slice(0, 6).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#' + color.toString(16).padStart(6, '0') }} />
              {type}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: '10px', color: '#555566' }}>
          {stats.nodes} nodes · {stats.rels} edges
        </div>
      </div>

      {/* 3D mount */}
      <div ref={mountRef} style={{ flex: 1, overflow: 'hidden', cursor: 'grab' }} />

      {/* Hover tooltip */}
      {hoveredNode && (
        <div style={{
          position: 'absolute', bottom: 40, left: 20,
          background: 'rgba(8,8,16,.95)', border: '1px solid rgba(201,168,76,.3)',
          borderRadius: 8, padding: '10px 14px', minWidth: 200, zIndex: 20,
          backdropFilter: 'blur(12px)', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '10px', color: '#666680', textTransform: 'uppercase', marginBottom: 3 }}>{hoveredNode.nodeType}</div>
          <div style={{ fontWeight: 700, color: '#F0C04A', marginBottom: 6, fontSize: '13px' }}>{hoveredNode.name}</div>
          {hoveredNode.extraProps && Object.entries(hoveredNode.extraProps).slice(0, 4).map(([k, v]) => (
            <div key={k} style={{ fontSize: '11px', color: '#B8A98A', display: 'flex', gap: 8, lineHeight: 1.6 }}>
              <span style={{ color: '#555566', minWidth: 80 }}>{k}</span>
              <span>{String(v).slice(0, 35)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 10, right: 16, fontSize: '9px', color: '#444455', fontFamily: 'monospace' }}>
        드래그: 회전 · 휠: 줌 · 클릭: 노드 정보
      </div>
    </div>
  )
}

function initScene(container, setHoveredNode, setStats) {
  const W = container.clientWidth || 800
  const H = container.clientHeight || 600

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x04040A)
  scene.fog = new THREE.FogExp2(0x04040A, 0.0012)

  const camera = new THREE.PerspectiveCamera(60, W / H, 1, 5000)
  camera.position.set(0, 0, 650)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const dir = new THREE.DirectionalLight(0xC9A84C, 0.7)
  dir.position.set(300, 400, 200)
  scene.add(dir)

  const pivot = new THREE.Group()
  scene.add(pivot)

  const nodeObjects = []

  // ── build graph ──
  function buildFromData(data) {
    const { nodes, relationships } = data
    const positions = {}
    setStats({ nodes: nodes.length, rels: relationships.length })

    nodes.forEach((node, i) => {
      const type = node.type || 'default'
      const color = NODE_COLORS[type] ?? NODE_COLORS.default
      const isCore = type === 'Core'
      const isRule = type === 'OntologyRule'

      let pos
      if (isCore) {
        pos = new THREE.Vector3(0, 0, 0)
      } else if (isRule) {
        const ruleNodes = nodes.filter(n => n.type === 'OntologyRule')
        const idx = ruleNodes.indexOf(node)
        const total = ruleNodes.length || 1
        const angle = (idx / total) * Math.PI * 2
        pos = new THREE.Vector3(
          Math.cos(angle) * 200,
          Math.sin(angle * 2) * 40,
          Math.sin(angle) * 200
        )
      } else {
        const phi = Math.acos(-1 + (2 * i) / Math.max(nodes.length, 1))
        const theta = Math.sqrt(nodes.length * Math.PI) * phi
        const r = type === 'Process' ? 350 : 460
        pos = new THREE.Vector3(
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(phi)
        )
      }
      positions[node.id] = pos

      const radius = isCore ? 22 : isRule ? 9 : 5
      const geo = new THREE.SphereGeometry(radius, isCore ? 20 : 10, isCore ? 20 : 10)
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: isCore ? 0.5 : 0.2,
        shininess: 90,
        transparent: true,
        opacity: isCore ? 1 : 0.92,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(pos)
      mesh.userData = {
        nodeType: type,
        name: node.properties?.name || node.properties?.trigger || node.id,
        extraProps: node.properties,
        originalColor: color,
      }
      pivot.add(mesh)
      nodeObjects.push(mesh)
    })

    // Edges
    relationships.forEach(rel => {
      const from = positions[rel.from]
      const to = positions[rel.to]
      if (!from || !to) return
      const color = REL_COLORS[rel.type] ?? REL_COLORS.default
      const pts = [from, to]
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: rel.type === 'TRIGGERS' ? 0.6 : 0.25 })
      pivot.add(new THREE.Line(geo, mat))
    })

    // Core glow ring
    const ringGeo = new THREE.TorusGeometry(35, 1.5, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.3 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    pivot.add(ring)
  }

  function buildFallback() {
    setStats({ nodes: 8, rels: 7 })
    const fallbackNodes = [
      { id: 'core', type: 'Core', name: 'ECOREAN BOC', pos: [0,0,0] },
      { id: 'r1', type: 'OntologyRule', name: 'LGS→석고보드', pos: [160,30,0] },
      { id: 'r2', type: 'OntologyRule', name: '타일→줄눈', pos: [-80,30,138] },
      { id: 'r3', type: 'OntologyRule', name: '타일→방수', pos: [-80,30,-138] },
      { id: 'p1', type: 'Process', name: '석고보드', pos: [320,0,60] },
      { id: 'p2', type: 'Process', name: '줄눈시공', pos: [-180,0,280] },
      { id: 'p3', type: 'Process', name: '욕실방수', pos: [-180,0,-280] },
      { id: 'p4', type: 'Process', name: 'LGS경량틀', pos: [0,-60,340] },
    ]
    fallbackNodes.forEach(n => {
      const color = NODE_COLORS[n.type] ?? NODE_COLORS.default
      const isCore = n.type === 'Core'
      const geo = new THREE.SphereGeometry(isCore ? 22 : n.type === 'OntologyRule' ? 9 : 6, 12, 12)
      const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.25, shininess: 80 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...n.pos)
      mesh.userData = { nodeType: n.type, name: n.name, extraProps: {}, originalColor: color }
      pivot.add(mesh)
      nodeObjects.push(mesh)
    })
    ;[[0,1],[0,2],[0,3],[1,4],[2,5],[3,6],[4,7]].forEach(([a,b]) => {
      const from = new THREE.Vector3(...fallbackNodes[a].pos)
      const to = new THREE.Vector3(...fallbackNodes[b].pos)
      const geo = new THREE.BufferGeometry().setFromPoints([from, to])
      const mat = new THREE.LineBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.4 })
      pivot.add(new THREE.Line(geo, mat))
    })
  }

  // Load graph data
  fetch('/data/graph-dataset.json')
    .then(r => r.json())
    .then(data => buildFromData(data))
    .catch(() => buildFallback())

  // Raycaster
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let currentHovered = null

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObjects(nodeObjects)
    if (hits.length > 0) {
      const obj = hits[0].object
      if (obj !== currentHovered) {
        if (currentHovered) currentHovered.material.emissiveIntensity = currentHovered.userData.nodeType === 'Core' ? 0.5 : 0.2
        currentHovered = obj
        obj.material.emissiveIntensity = 0.7
        container.style.cursor = 'pointer'
      }
      setHoveredNode(obj.userData)
    } else {
      if (currentHovered) {
        currentHovered.material.emissiveIntensity = currentHovered.userData.nodeType === 'Core' ? 0.5 : 0.2
        currentHovered = null
      }
      setHoveredNode(null)
      container.style.cursor = 'grab'
    }
  }

  // Orbit controls (manual)
  let isDragging = false, lastX = 0, lastY = 0
  const onDown = e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; container.style.cursor = 'grabbing' }
  const onUp = () => { isDragging = false; container.style.cursor = 'grab' }
  const onDrag = e => {
    if (!isDragging) return
    pivot.rotation.y += (e.clientX - lastX) * 0.005
    pivot.rotation.x += (e.clientY - lastY) * 0.004
    pivot.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pivot.rotation.x))
    lastX = e.clientX; lastY = e.clientY
  }
  const onWheel = e => {
    camera.position.z = Math.max(100, Math.min(1500, camera.position.z + e.deltaY * 0.5))
    e.preventDefault()
  }

  container.addEventListener('mousemove', onMouseMove)
  container.addEventListener('mousemove', onDrag)
  container.addEventListener('mousedown', onDown)
  container.addEventListener('mouseup', onUp)
  container.addEventListener('mouseleave', onUp)
  container.addEventListener('wheel', onWheel, { passive: false })

  // Resize
  const ro = new ResizeObserver(() => {
    const nW = container.clientWidth, nH = container.clientHeight
    if (nW && nH) {
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
  })
  ro.observe(container)

  // Animation loop
  let animId
  let tick = 0
  function animate() {
    animId = requestAnimationFrame(animate)
    tick++
    if (tick % 3 === 0) pivot.rotation.y += 0.001
    renderer.render(scene, camera)
  }
  animate()

  return {
    dispose() {
      cancelAnimationFrame(animId)
      ro.disconnect()
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mousemove', onDrag)
      container.removeEventListener('mousedown', onDown)
      container.removeEventListener('mouseup', onUp)
      container.removeEventListener('mouseleave', onUp)
      container.removeEventListener('wheel', onWheel)
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }
}
