import { useState } from 'react'
import { useStore } from '@ecorean/shared/store'
import Button from '@ecorean/shared/ui/Button'
import Card from '@ecorean/shared/ui/Card'

const SPACE_TYPES = [
  { id: 'living',   label: '거실' },
  { id: 'bedroom',  label: '침실' },
  { id: 'bathroom', label: '욕실' },
  { id: 'kitchen',  label: '주방' },
  { id: 'balcony',  label: '발코니' },
  { id: 'hallway',  label: '현관·복도' },
  { id: 'other',    label: '기타' },
]

export default function Step2({ onNext, onPrev }) {
  const spaces = useStore(s => s.spaces)
  const addSpace = useStore(s => s.addSpace)
  const removeSpace = useStore(s => s.removeSpace)
  const updateSpace = useStore(s => s.updateSpace)

  const [form, setForm] = useState({ name: '', type: 'living', width: 3000, length: 4000, height: 2400 })

  const totalArea = spaces.reduce((s, sp) => s + (sp.width / 1000) * (sp.length / 1000), 0)

  const handleAdd = () => {
    if (!form.name.trim()) { alert('공간명 입력'); return }
    addSpace({
      id: 'sp_' + Date.now(),
      name: form.name, type: form.type,
      width: +form.width, length: +form.length, height: +form.height,
      windows: [], doors: [{ type: '여닫이', w: 900, h: 2100 }],
      corners: 4, wet: form.type === 'bathroom',
    })
    setForm(f => ({ ...f, name: '' }))
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', color: 'var(--gold)' }}>공간 실측</h2>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--gold-bright)' }}>
          합계 {totalArea.toFixed(2)} ㎡
        </div>
      </div>

      {/* 추가 폼 */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>공간명</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="거실, 안방 등" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>유형</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
              {SPACE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>가로 (mm)</label>
            <input type="number" value={form.width} onChange={e => setForm(f => ({ ...f, width: +e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>세로 (mm)</label>
            <input type="number" value={form.length} onChange={e => setForm(f => ({ ...f, length: +e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>층고 (mm)</label>
            <input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: +e.target.value }))} style={inputStyle} />
          </div>
          <Button onClick={handleAdd} style={{ padding: '8px 16px', alignSelf: 'flex-end' }}>+ 추가</Button>
        </div>
      </Card>

      {/* 공간 목록 */}
      {spaces.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dim)' }}>
          공간을 추가하세요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {spaces.map(sp => {
            const area = (sp.width / 1000) * (sp.length / 1000)
            return (
              <Card key={sp.id} style={{ padding: '12px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 120px 60px auto', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>{sp.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--dim)' }}>
                    {SPACE_TYPES.find(t => t.id === sp.type)?.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>W {sp.width.toLocaleString()}mm</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>L {sp.length.toLocaleString()}mm</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>H {sp.height.toLocaleString()}mm</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--gold-bright)', fontWeight: 700 }}>
                    {area.toFixed(2)}㎡
                  </div>
                  <Button variant="danger" onClick={() => removeSpace(sp.id)} style={{ padding: '4px 10px', fontSize: '11px' }}>
                    삭제
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button variant="ghost" onClick={onPrev}>← 이전</Button>
        <Button onClick={onNext} disabled={spaces.length === 0}>다음 단계 →</Button>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: '11px', color: 'var(--dim)', display: 'block', marginBottom: 4 }
const inputStyle = {
  width: '100%', background: 'var(--raised)', border: '1px solid var(--border3)',
  borderRadius: 'var(--r)', padding: '7px 10px', color: 'var(--text)', fontSize: '12px', outline: 'none',
}
