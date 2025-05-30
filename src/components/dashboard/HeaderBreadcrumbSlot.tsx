import React from 'react';
import { usePageActionContext } from '@/context/PageActionContext';

export const HeaderBreadcrumbSlot: React.FC = () => {
  const { breadcrumbNode } = usePageActionContext();

  if (!breadcrumbNode) {
    return null;
  }

  // The breadcrumbNode itself should be a styled component (e.g., using Shadcn Breadcrumb)
  return <div className="flex items-center mr-4">{breadcrumbNode}</div>; 
};
