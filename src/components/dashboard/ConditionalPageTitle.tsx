import React from 'react';
import { usePageActionContext } from '@/context/PageActionContext';

interface ConditionalPageTitleProps {
  pageTitle: string;
}

export const ConditionalPageTitle: React.FC<ConditionalPageTitleProps> = ({ pageTitle }) => {
  const { breadcrumbNode } = usePageActionContext();

  // If a breadcrumb is present, assume it handles the title display or makes the h1 redundant.
  if (breadcrumbNode) {
    return null; 
  }

  return <h1 className="text-xl font-semibold hidden sm:inline-flex">{pageTitle}</h1>;
};
