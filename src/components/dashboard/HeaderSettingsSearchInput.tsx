import React from 'react';
import { useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useOptionalSettingsSearch } from '@/context/SettingsSearchContext';

export function HeaderSettingsSearchInput() {
  const location = useLocation();
  const settingsSearchContext = useOptionalSettingsSearch();

  // Only show search input if on a settings page and context is available
  if (!location.pathname.includes('/dashboard/settings') || !settingsSearchContext) {
    return null;
  }

  const { searchQuery, setSearchQuery } = settingsSearchContext;

  return (
    <div className="w-full max-w-sm">
      <Input
        type="search"
        placeholder="Search settings..."
        className="md:w-[200px] lg:w-[300px]"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
