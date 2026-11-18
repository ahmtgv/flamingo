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
/* Витринный набор: второй набор типографики, только титул (решение владельца 08.09). */
import './styles/витрина.css'
import './styles/base.css'
import { подготовитьЯзык } from './lib/язык.ts'

/* Словарь языка — до первого кадра и до того, как загрузятся сами экраны:
   часть текстов собирается при загрузке модуля (каталог источников,
   сценарии теста), и переводиться им не из чего, пока нет словаря. */
void подготовитьЯзык().finally(async () => {
  const { App } = await import('./App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
