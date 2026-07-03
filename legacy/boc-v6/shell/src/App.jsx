import { lazy, Suspense, useState } from 'react'
import KPIBar from '@ecorean/shared/ui/KPIBar'
import TabNav from './components/TabNav.jsx'

// 각 모듈 lazy load
const MODULES = {
  estimate:   lazy(() => import('../../modules/estimate/src/index.jsx')),
  projects:   lazy(() => import('../../modules/projects/src/index.jsx')),
  presets:    lazy(() => import('../../modules/presets/src/index.jsx')),
  reports:    lazy(() => import('../../modules/reports/src/index.jsx')),
  completion: lazy(() => import('../../modules/completion/src/index.jsx')),
  approval:   lazy(() => import('../../modules/approval/src/index.jsx')),
  dbmgr:      lazy(() => import('../../modules/dbmgr/src/index.jsx')),
  ontology:   lazy(() => import('../../modules/ontology/src/index.jsx')),
  aiengine:   lazy(() => import('../../modules/ai/src/index.jsx')),
}

function Loading() {
  return (
    <div className="module-loading">
      LOADING MODULE...
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('estimate')
  const ActiveModule = MODULES[activeTab]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <KPIBar />
      <TabNav active={activeTab} onChange={setActiveTab} />
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <Suspense fallback={<Loading />}>
          {ActiveModule && <ActiveModule />}
        </Suspense>
      </main>
    </div>
  )
}
