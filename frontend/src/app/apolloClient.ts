import { ApolloClient, ApolloLink, fromPromise, HttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

import { GRAPHQL_HTTP_URL } from '@/shared/lib/env';
import { refreshAccessToken } from '@/shared/lib/refresh';
import { clearSession, getAccessToken, getRefreshToken } from '@/shared/lib/session';

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

// Inject the in-memory access token on every request.
const authLink = setContext((_operation, prevContext) => {
  const token = getAccessToken();
  const headers = (prevContext.headers as Record<string, string>) ?? {};
  return {
    headers: token ? { ...headers, authorization: `Bearer ${token}` } : headers,
  };
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

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
