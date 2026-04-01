import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getStoredTheme, applyTheme, getStoredFont, applyFont } from './components/ThemeSelector'

// Apply saved theme and font before first paint
applyTheme(getStoredTheme())
applyFont(getStoredFont())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
