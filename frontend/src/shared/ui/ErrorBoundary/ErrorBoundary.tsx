import { Component, type ErrorInfo, type ReactNode } from 'react';

import { CrashFallback } from './CrashFallback';

/**
 * Global error boundary. A render error anywhere below unmounts the tree to React's default
 * blank screen unless caught here; instead we show the calm crash panel (atlas sheet 11).
 * Wrap the whole app (including the router) with this.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for diagnostics; a real error-reporting sink can subscribe here later.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.hasError ? <CrashFallback /> : this.props.children;
  }
}
