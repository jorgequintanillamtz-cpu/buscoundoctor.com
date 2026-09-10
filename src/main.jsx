import React from 'react'
import ReactDOM from 'react-dom/client'
import moment from 'moment'
import App from '@/App.jsx'
import '@/index.css'

moment.locale('es')

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
