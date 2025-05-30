import React from 'react';
import { usePageActionContext } from '@/context/PageActionContext';
import { useLocation } from 'react-router-dom';

export const HeaderSecondaryActionSlot: React.FC = () => {
  const { secondaryActionNode } = usePageActionContext();
  const location = useLocation();

  // Only show secondary actions on specific pages if needed.
  const path = location.pathname;
  const isSegmentsPage = path.startsWith("/dashboard/segments");
  const isContactsPage = path.startsWith("/dashboard/contacts"); // Added condition for Contacts page

  // Show if node exists AND (it's segments page OR it's contacts page)
  // Or, if you want it to show on any page that sets a secondaryActionNode, remove page checks:
  // if (!secondaryActionNode) { return null; }
  // if (!secondaryActionNode || !(isSegmentsPage || isContactsPage)) { // Original condition
  //   return null;
  // }

  // Show on any page if secondaryActionNode is set
  if (!secondaryActionNode) {
    return null;
  }

  // Potentially wrap the node in a div with some margin if needed, e.g., <div className="mr-2">{secondaryActionNode}</div>
  return <>{secondaryActionNode}</>;
};
