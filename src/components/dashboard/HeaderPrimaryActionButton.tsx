import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageActionContext } from '@/context/PageActionContext';
import { PlusCircle } from 'lucide-react'; // Default icon

export const HeaderPrimaryActionButton: React.FC = () => {
  const { primaryAction } = usePageActionContext();
  const location = useLocation();

  // Determine if the button should be shown based on the page and if an action is set
  const path = location.pathname;
  let showButton = false;

  if (primaryAction) {
    if (path.startsWith("/dashboard/teams") && primaryAction.id === 'create-new-team') {
      showButton = true;
    } else if (path.startsWith("/dashboard/segments") && primaryAction.id === 'create-new-segment') {
      showButton = true;
    } else if (path.startsWith("/dashboard/contacts") && primaryAction.id === 'create-contact') { // Added condition for Contacts page
      showButton = true;
    }
    // Add other pages and action IDs here if needed
  }

  if (!showButton || !primaryAction) { // Ensure primaryAction is not null before accessing its properties
    return null;
  }

  const IconComponent = primaryAction.icon || PlusCircle;

  return (
    <Button onClick={primaryAction.action} className="flex items-center gap-2">
      <IconComponent className="h-4 w-4" />
      {primaryAction.label}
    </Button>
  );
};
