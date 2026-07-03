'use client';

import React from 'react';
import { SearchBar } from '../common/search-bar';
import { NotificationPanel } from '../common/notification-panel';
import { ProfileDropdown } from '../common/profile-dropdown';

export function Topbar() {
  const handleSearch = (value: string) => {
    console.log('Searching for:', value);
    // Implement global search logic
  };

  return (
    <header className="h-[72px] bg-card border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 w-full transition-colors duration-150">
      {/* Global Search Interface */}
      <div className="w-[320px]">
        <SearchBar onSearch={handleSearch} placeholder="Search patients, doctors, records..." />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-4">
        <NotificationPanel />
        <ProfileDropdown />
      </div>
    </header>
  );
}
