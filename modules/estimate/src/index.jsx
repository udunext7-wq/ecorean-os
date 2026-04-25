import { useState } from 'react'
import StepBar from '@ecorean/shared/ui/StepBar'
import Step1 from './steps/Step1.jsx'
import Step2 from './steps/Step2.jsx'
import Step3 from './steps/Step3.jsx'
import Step4 from './steps/Step4.jsx'
import Step5 from './steps/Step5.jsx'
import Step6 from './steps/Step6.jsx'

const STEPS = [Step1, Step2, Step3, Step4, Step5, Step6]

export default function EstimateModule() {
  const [step, setStep] = useState(0)
  const StepComponent = STEPS[step]

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <StepBar current={step} onChange={setStep} />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <StepComponent onNext={next} onPrev={prev} step={step} totalSteps={STEPS.length} />
      </div>
    </div>
  )
}
