import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConditionalRendererProps<TDataItem, TQueryError = Error> {
  isLoading: boolean;
  isError: boolean;
  error: TQueryError | null;
  data: TDataItem[] | undefined;
  renderItem: (item: TDataItem, index: number) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: TQueryError) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  loadingItemCount?: number;
  className?: string;
  layout?: 'list' | 'grid';
  gridClassName?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  errorMessage?: string;
  errorTitle?: string;
}

export function ConditionalRenderer<TDataItem, TQueryError = Error>({
  isLoading,
  isError,
  error,
  data,
  renderItem,
  renderLoading,
  renderError,
  renderEmpty,
  loadingItemCount = 3,
  className = "",
  layout = 'list',
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4',
  emptyMessage = "There is no data to display at the moment.",
  emptyTitle = "No Data",
  errorMessage, // Default will be error.message
  errorTitle = "Error Fetching Data",
}: ConditionalRendererProps<TDataItem, TQueryError>) {
  if (isLoading) {
    if (renderLoading) {
      return renderLoading();
    }
    return (
      <div className={cn("space-y-2", className, layout === 'grid' ? gridClassName : '')}>
        {Array.from({ length: loadingItemCount }).map((_, index) =>
          layout === 'grid' ? (
            <Skeleton key={index} className="h-32 w-full" />
          ) : (
            <Skeleton key={index} className="h-10 w-full" />
          )
        )}
      </div>
    );
  }

  if (isError) {
    if (renderError) {
      return renderError(error!); // error will be defined if isError is true
    }
    return (
      <Alert variant="destructive" className={className}>
        <Terminal className="h-4 w-4" />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>
          {errorMessage || (error as Error)?.message || 'An unknown error occurred.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    if (renderEmpty) {
      return renderEmpty();
    }
    return (
      <Alert className={className}>
        <Info className="h-4 w-4" />
        <AlertTitle>{emptyTitle}</AlertTitle>
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    );
  }

  const listContainerClassName = layout === 'grid' ? gridClassName : "space-y-2";

  return (
    <div className={cn(listContainerClassName, className)}>
      {data.map((item, index) => renderItem(item, index))}
    </div>
  );
}

export default ConditionalRenderer;
