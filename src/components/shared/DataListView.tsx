import React from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import ConditionalRenderer from './ConditionalRenderer'; // Import ConditionalRenderer
import { cn } from '@/lib/utils';

interface DataListViewProps<TDataItem, TQueryError = Error> {
  queryKey: unknown[];
  queryFn: () => Promise<TDataItem[]>;
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

export function DataListView<TDataItem, TQueryError = Error>({
  queryKey,
  queryFn,
  renderItem,
  renderLoading,
  renderError,
  renderEmpty,
  loadingItemCount, // Pass down to ConditionalRenderer
  className,
  layout,
  gridClassName,
  emptyMessage,
  emptyTitle,
  errorMessage,
  errorTitle,
}: DataListViewProps<TDataItem, TQueryError>) {
  const {
    data,
    isLoading,
    isError,
    error,
  }: UseQueryResult<TDataItem[], TQueryError> = useQuery<TDataItem[], TQueryError>({
    queryKey: queryKey,
    queryFn: queryFn,
  });

  return (
    <ConditionalRenderer<TDataItem, TQueryError>
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={data}
      renderItem={renderItem}
      renderLoading={renderLoading}
      renderError={renderError}
      renderEmpty={renderEmpty}
      loadingItemCount={loadingItemCount}
      className={className}
      layout={layout}
      gridClassName={gridClassName}
      emptyMessage={emptyMessage}
      emptyTitle={emptyTitle}
      errorMessage={errorMessage}
      errorTitle={errorTitle}
    />
  );
}

export default DataListView;
