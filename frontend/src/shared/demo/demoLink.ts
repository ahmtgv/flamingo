/**
 * TEMPORARY browser demo Apollo link (VITE_PREVIEW=1).
 *
 * A terminating ApolloLink that resolves every operation IN THE BROWSER from synthetic data
 * (resolveDemoOperation) — it never touches the network, so a preview build makes ZERO
 * requests to `/graphql/` (verify in DevTools → Network). Subscriptions (`AttentionUpdates`)
 * emit synthetic per-bucket aggregates on an interval for the teacher's live view.
 *
 * Wired in app/apolloClient.ts strictly behind the VITE_PREVIEW flag; remove with the demo layer.
 */
import { ApolloLink, type FetchResult, Observable } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

import { nextAttentionMetric, resolveDemoOperation } from './resolveDemoOperation';

/** Simulated latency so loading states flash briefly, then populate (feels real, still $0). */
const LATENCY_MS = 60;
/** How often the synthetic attention subscription emits a bucket. */
const TICK_MS = 2_000;

export const demoLink = new ApolloLink(
  (operation) =>
    new Observable<FetchResult>((observer) => {
      const def = getMainDefinition(operation.query);
      const isSubscription =
        def.kind === 'OperationDefinition' && def.operation === 'subscription';

      if (isSubscription) {
        // Only AttentionUpdates is implemented live; anything else stays an empty stream.
        if (operation.operationName !== 'AttentionUpdates') return () => undefined;
        const sessionId = String(operation.variables?.sessionId ?? 'ses-demo');
        const emit = () => observer.next({ data: nextAttentionMetric(sessionId) });
        const first = setTimeout(emit, LATENCY_MS);
        const iv = setInterval(emit, TICK_MS);
        return () => {
          clearTimeout(first);
          clearInterval(iv);
        };
      }

      const timer = setTimeout(() => {
        const data = resolveDemoOperation(operation.operationName, operation.variables ?? {});
        observer.next({ data: data ?? {} });
        observer.complete();
      }, LATENCY_MS);
      return () => clearTimeout(timer);
    }),
);
