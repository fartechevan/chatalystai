import React, { createContext, useState, useContext, ReactNode } from 'react';

interface SettingsSearchContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SettingsSearchContext = createContext<SettingsSearchContextValue | undefined>(undefined);

export const SettingsSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SettingsSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </SettingsSearchContext.Provider>
  );
};

export const useSettingsSearch = (): SettingsSearchContextValue => {
  const context = useContext(SettingsSearchContext);
  if (context === undefined) {
    throw new Error('useSettingsSearch must be used within a SettingsSearchProvider');
  }
  return context;
};

// A hook for optional consumption, e.g. by a global header search input
export const useOptionalSettingsSearch = (): SettingsSearchContextValue | undefined => {
  return useContext(SettingsSearchContext);
};
