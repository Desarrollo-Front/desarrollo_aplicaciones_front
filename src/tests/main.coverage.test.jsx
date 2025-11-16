import { describe, test, expect, vi, afterEach } from 'vitest';
import React from 'react';

// Ensure React is available globally for JSX in modules executed during tests
globalThis.React = React;

// Use virtual mocks at module level so Vite's import analysis can resolve them
// Set global flags to detect calls
globalThis.__mockRenderCalled = false;


vi.mock('react-dom/client', () => ({
  createRoot: (el) => ({
    render: () => {
      globalThis.__mockRenderCalled = true;
    },
  }),
}), { virtual: true });

vi.mock('@sentry/react', () => {
  const ErrorBoundary = ({ children }) => children;
  const replayIntegration = () => ({});
  return {
    ErrorBoundary,
    init: () => {},
    replayIntegration,
    captureException: () => {},
    addBreadcrumb: () => {},
    setUser: () => {},
    default: { init: () => {}, ErrorBoundary },
  };
}, { virtual: true });

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  globalThis.__mockRenderCalled = false;
  document.body.innerHTML = '';
});

describe('main.jsx bootstrap', () => {
  test('imports and calls createRoot().render with app tree', async () => {
    // ensure root is present
    document.body.innerHTML = '<div id="root"></div>';

    // dynamic import so mocks take effect
    await import('../main.jsx');

    expect(globalThis.__mockRenderCalled).toBe(true);
  });
});
