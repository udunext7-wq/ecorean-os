import { useRef, useEffect } from 'react'
import { useStore } from '@ecorean/shared/store'

const TABS = [
  { id: 'estimate',   label: '견적 마법사' },
  { id: 'projects',   label: '프로젝트' },
  { id: 'presets',    label: '프리셋' },
  { id: 'reports',    label: '보고서' },
  { id: 'completion', label: '완료보고' },
  { id: 'approval',   label: '승인함' },
  { id: 'dbmgr',      label: 'DB관리' },
  { id: 'ontology',   label: '온톨로지' },
  { id: 'aiengine',   label: 'AI 엔진' },
]

export default function TabNav({ active, onChange }) {
  const sliderRef = useRef(null)
  const tabsRef = useRef({})
  const pendingCount = useStore(s => s.approvalReqs.filter(r => r.approvalStatus === 'pending').length)

  useEffect(() => {
    const activeEl = tabsRef.current[active]
    const slider = sliderRef.current
    if (activeEl && slider) {
      slider.style.left = activeEl.offsetLeft + 'px'
      slider.style.width = activeEl.offsetWidth + 'px'
    }
  }, [active])

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', position: 'relative',
      background: 'var(--deep)', borderBottom: '1px solid var(--border3)',
      padding: '0 16px', height: 40, flexShrink: 0,
    }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          ref={el => tabsRef.current[tab.id] = el}
          onClick={() => onChange(tab.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 14px', height: '100%', fontSize: '12px', fontWeight: 600,
            color: active === tab.id ? 'var(--gold-bright)' : 'var(--dim)',
            transition: 'color .2s', whiteSpace: 'nowrap', position: 'relative',
          }}
        >
          {tab.label}
          {tab.id === 'approval' && pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 2,
              background: 'var(--red)', color: '#fff',
              fontSize: '9px', fontWeight: 700, borderRadius: '999px',
              padding: '1px 5px', lineHeight: 1.4,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      ))}
      <div ref={sliderRef} className="tab-slider" />
    </nav>
  )
}
