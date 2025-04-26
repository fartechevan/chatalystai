import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void; // Optional handler for clickable items
  isCurrent?: boolean; // To style the last item differently
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          <span
            className={cn(
              "px-2 py-1 rounded-md", // Basic padding and rounding
              item.onClick && !item.isCurrent && "hover:bg-accent hover:text-accent-foreground cursor-pointer", // Hover effect for clickable items
              item.isCurrent && "font-medium text-foreground bg-muted" // Style for the current page
            )}
            onClick={item.onClick}
            aria-current={item.isCurrent ? 'page' : undefined}
          >
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
