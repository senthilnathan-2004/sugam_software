'use client';

import * as React from 'react';
import { ThemeProvider } from './theme-provider';
import { ErrorBoundary } from '@/components/common/error-boundary';

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {/* App-wide boundary: a render crash in any panel shows a recoverable
          error card instead of a blank white screen. */}
      <ErrorBoundary>{children}</ErrorBoundary>
    </ThemeProvider>
  );
}
