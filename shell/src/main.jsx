import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from '@ecorean/shared/ui/Toast'
import '@ecorean/shared/theme.css'
import './styles/global.css'
import { initDB } from './initDB.js'

initDB()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
)
