import React from 'react';
import { Segment } from '@/types/segments';
import { Customer } from '@/types/customers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload } from 'lucide-react'; // For back button and Import icon
import { SegmentContactsDataTable } from './list/SegmentContactsDataTable'; // Added import
import { getSegmentContactsTableColumns } from './list/SegmentContactsTableColumns'; // Added import

interface SegmentContactsDetailViewProps {
  segment: Segment;
  contacts: Customer[];
  isLoading: boolean;
  onBack: () => void; 
  onDeleteContactFromSegment: (segmentId: string, contactId: string) => Promise<void>;
  onOpenImportModal: () => void; // New prop to open import modal
  isProcessingActions?: boolean; 
}

export const SegmentContactsDetailView: React.FC<SegmentContactsDetailViewProps> = ({
  segment,
  contacts,
  isLoading,
  onBack,
  onDeleteContactFromSegment,
  onOpenImportModal, // New prop
  isProcessingActions,
}) => {
  const columns = React.useMemo(
    () => getSegmentContactsTableColumns({ 
      onDeleteContactFromSegment, 
      segmentId: segment.id, 
      isProcessingActions 
    }),
    [onDeleteContactFromSegment, segment.id, isProcessingActions]
  );

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Segments
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{segment.name}</CardTitle>
            <CardDescription>
              Manage contacts within this segment.
            </CardDescription>
          </div>
          <Button onClick={onOpenImportModal} size="sm" variant="default" disabled={isProcessingActions}>
            <Upload className="mr-2 h-4 w-4" />
            Import Contacts
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading contacts...</p>
          ) : (
            <SegmentContactsDataTable columns={columns} data={contacts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
