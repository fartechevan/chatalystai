import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  action: () => void;
}

interface PageActionContextType {
  primaryAction: PageAction | null;
  setPrimaryAction: (action: PageAction | null) => void;
  secondaryActionNode: React.ReactNode | null;
  setSecondaryActionNode: (node: React.ReactNode | null) => void;
  breadcrumbNode: React.ReactNode | null; // New: For breadcrumbs
  setBreadcrumbNode: (node: React.ReactNode | null) => void; // New
}

const PageActionContext = createContext<PageActionContextType | undefined>(undefined);

export const usePageActionContext = () => {
  const context = useContext(PageActionContext);
  if (!context) {
    throw new Error('usePageActionContext must be used within a PageActionProvider');
  }
  return context;
};

interface PageActionProviderProps {
  children: ReactNode;
}

export const PageActionProvider: React.FC<PageActionProviderProps> = ({ children }) => {
  const [primaryAction, setPrimaryActionState] = useState<PageAction | null>(null);
  const [secondaryActionNode, setSecondaryActionNodeState] = useState<React.ReactNode | null>(null);
  const [breadcrumbNode, setBreadcrumbNodeState] = useState<React.ReactNode | null>(null); // New

  const setPrimaryAction = useCallback((action: PageAction | null) => {
    setPrimaryActionState(action);
  }, []);

  const setSecondaryActionNode = useCallback((node: React.ReactNode | null) => {
    setSecondaryActionNodeState(node);
  }, []);

  const setBreadcrumbNode = useCallback((node: React.ReactNode | null) => { // New
    setBreadcrumbNodeState(node);
  }, []);

  return (
    <PageActionContext.Provider 
      value={{ 
        primaryAction, setPrimaryAction, 
        secondaryActionNode, setSecondaryActionNode,
        breadcrumbNode, setBreadcrumbNode // New
      }}
    >
      {children}
    </PageActionContext.Provider>
  );
};
