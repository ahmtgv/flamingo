import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Шрифты продукта. Лежат рядом с ним, а не на чужом CDN: одинаковы на маке,
   на Windows и на андроиде — см. `--font-heading` в tokens.css. */
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'

import './styles/tokens.css'
import './styles/base.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
