import {
  ApolloClient,
  ApolloLink,
  fromPromise,
  HttpLink,
  InMemoryCache,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

import { demoLink } from '@/shared/demo/demoLink';
import { GRAPHQL_HTTP_URL, GRAPHQL_WS_URL } from '@/shared/lib/env';
import { refreshAccessToken } from '@/shared/lib/refresh';
import { credentialFor } from '@/shared/lib/credential';
import { clearSession, getAccessToken, getRefreshToken } from '@/shared/lib/session';

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

/**
 * Кто делает запрос: человек или машина.
 *
 * 🔴 Найдено владельцем 15.08: отсюда уходил ТОЛЬКО пользовательский токен, а в приложении
 * пользовательской сессии нет и не будет — пароль там не спрашивают (§19.4). Между тем шаги
 * 2–5 мастера ходят на мутации с `require_device`, то есть требуют `Authorization: Device`.
 * Предъявить его было нечем, и весь мастер после связывания стоял: кнопки нажимались и молча
 * ничего не делали.
 *
 * 🔴 РЕГРЕССИЯ 16.08 ОТ СОБСТВЕННОЙ ЖЕ ПРАВКИ (промпт 21 §2.2). Выбор был **по наличию**:
 * есть токен — `Bearer`, нет — `Device`. Пока пользовательской сессии в приложении не бывало
 * никогда, «по наличию» случайно совпадало с «по смыслу». §Б0-септ научил связывание выдавать
 * сессию — и все восемь `require_device`-операций пошли как `Bearer`. Мастер встал на переходе
 * 1→2: `advanceDeviceSetup` отвечала «Device authentication required».
 *
 * Правка открыла тропинку, по которой код раньше не ходил. Третий такой случай подряд, поэтому
 * теперь выбор **по операции**, а список операций **сгенерирован из резолверов бэкенда**
 * (`deviceOperations.generated.ts`) — рукописный разошёлся бы с кодом на первой новой мутации.
 *
 * Три правила:
 *
 * 1. **Операция решает, кто нужен.** `require_device` на сервере ⇒ `Device` в заголовке, даже
 *    когда сессия человека есть. Наоборот тоже: обычная операция идёт от человека.
 * 2. **Приоритет у человека там, где годятся оба.** `consenting_user`-резолверы принимают и
 *    того, и другого; идёт человек — иначе браузер преподавателя, открытый рядом, начал бы
 *    ходить с правами машины.
 * 3. **Никогда оба заголовка сразу.** Заголовок один, и сервер не должен гадать, кто перед
 *    ним: `Device` — это НЕ сессия, он разрешается в машину, а не в пользователя, и подменять
 *    им человека нельзя (`common/auth.py`).
 */
const authLink = setContext((operation, prevContext) => {
  const headers = (prevContext.headers as Record<string, string>) ?? {};
  const credential = credentialFor(operation.operationName);
  return credential ? { headers: { ...headers, ...credential } } : { headers };
});

const AUTH_ERROR = /authentication required|invalid token|token has expired|wrong token type/i;

// On an auth error, try a single silent refresh and replay the operation.
const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  const isAuthError = graphQLErrors?.some((e) => AUTH_ERROR.test(e.message));
  if (!isAuthError) return;
  if (operation.operationName === 'RefreshToken' || !getRefreshToken()) return;

  return fromPromise(refreshAccessToken()).flatMap((ok) => {
    if (!ok) clearSession();
    // On success authLink re-runs with the new token; on failure the replay
    // surfaces the auth error so ProtectedRoute redirects to /login.
    return forward(operation);
  });
});

const httpChain = ApolloLink.from([errorLink, authLink, httpLink]);

// Subscriptions go over WebSocket (graphql-ws); the JWT travels in connectionParams
// (the seedum subscription resolver reads `authToken`). `lazy` defers the socket until
// the first subscription, so HTTP-only sessions (and tests) never open it.
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_URL,
    lazy: true,
    connectionParams: () => {
      const token = getAccessToken();
      return token ? { authToken: `Bearer ${token}` } : {};
    },
  }),
);

// Route subscriptions → WS, everything else → the authed/refreshing HTTP chain.
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpChain,
);

// TEMPORARY: preview builds (VITE_PREVIEW=1) run entirely on the in-browser demo layer —
// the demo link terminates every operation locally, so there is NO network traffic to
// `/graphql/` (nothing leaves the device). Remove with the demo layer before real launch.
const link = import.meta.env.VITE_PREVIEW === '1' ? demoLink : splitLink;

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
