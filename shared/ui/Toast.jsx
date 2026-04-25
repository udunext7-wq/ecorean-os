import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((msg, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '10px 16px', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500,
            animation: 'slideIn .3s ease',
            background: t.type === 'error' ? 'rgba(255,85,116,0.15)' : t.type === 'warn' ? 'rgba(255,170,68,0.15)' : 'rgba(93,221,160,0.15)',
            border: `1px solid ${t.type === 'error' ? 'var(--red)' : t.type === 'warn' ? 'var(--orange)' : 'var(--green)'}`,
            color: t.type === 'error' ? 'var(--red)' : t.type === 'warn' ? 'var(--orange)' : 'var(--green)',
            boxShadow: 'var(--shadow-card)',
          }}>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
