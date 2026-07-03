'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Collapsible Left Sidebar */}
      <Sidebar />

      {/* Main content column — takes remaining width, scrolls independently */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Sticky topbar */}
        <Topbar />

        {/* Scrollable content area — overflow-y-auto is the scroll fix */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <main className="w-full mx-auto px-6 py-6 pb-16">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
