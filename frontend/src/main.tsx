import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Шрифты продукта. Лежат рядом с ним, а не на чужом CDN: одинаковы на маке,
   на Windows и на андроиде — см. `--font-heading` в tokens.css. */
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
/* 🔴 Голоса нового закона экранов (решение владельца 03.09) — лежат рядом с
   продуктом, как и прежние: в чужие CDN за шрифтом мы не ходим. Пока ни один
   экран не помечен `data-язык="пергамент"`, они только в сборке и ни на что
   не влияют. */
import '@fontsource-variable/inter'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'

import './styles/tokens.css'
import './styles/пергамент.css'
import './styles/base.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
