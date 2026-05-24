import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Version switcher — open localhost:5173/?v=7 to view V7, otherwise V8 loads
const params = new URLSearchParams(window.location.search)
const version = params.get('v') === '7' ? 'v7' : 'v8'

const VersionBadge = () => (
  <div style={{
    position:'fixed', top:8, right:12, zIndex:9999,
    background: version === 'v7' ? '#4A2810' : '#2ECC71',
    color: version === 'v7' ? '#E8C99A' : '#050709',
    padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700,
    letterSpacing:1, fontFamily:'monospace',
    boxShadow:'0 4px 12px rgba(0,0,0,0.5)', pointerEvents:'none',
  }}>
    VIEWING {version.toUpperCase()}
  </div>
)

async function render() {
  const App = version === 'v7'
    ? (await import('./App.v7.jsx')).default
    : (await import('./App.jsx')).default
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <VersionBadge />
      <App />
    </React.StrictMode>,
  )
}
render()
