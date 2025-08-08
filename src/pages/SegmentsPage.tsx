import React, { useEffect, useState, useCallback } from 'react';
import { Segment } from '@/types/segments';
import { Customer } from '@/types/customers'; // Import Customer type
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SegmentsDataTable, SegmentsTableMeta } from '@/components/segments/list/SegmentsDataTable'; // Import SegmentsTableMeta
import { columns as segmentColumns } from '@/components/segments/list/columns';
import { usePageActionContext } from '@/context/PageActionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, ArrowLeft } from 'lucide-react'; // Added ArrowLeft for back button
import { useAuth } from '@/components/auth/AuthProvider';
import { SegmentContactsDetailView } from '@/components/segments/SegmentContactsDetailView';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"; // Shadcn Breadcrumb

const SegmentsPage: React.FC = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth(); // Get current user and session

  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);

  // State for Edit Segment Modal
  const [showEditSegmentModal, setShowEditSegmentModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [editedSegmentName, setEditedSegmentName] = useState('');
  const [isUpdatingSegment, setIsUpdatingSegment] = useState(false);
  
  // General processing state for meta (can combine create/update/delete)
  const [isProcessing, setIsProcessing] = useState(false); // For main table actions
  const [isDetailViewProcessing, setIsDetailViewProcessing] = useState(false); // For actions within detail view

  // State for Import Contacts Modal
  const [showImportContactsModal, setShowImportContactsModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportingContacts, setIsImportingContacts] = useState(false);

  // View mode state
  type ViewMode = 'list' | 'details';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSegmentForDetails, setSelectedSegmentForDetails] = useState<Segment | null>(null);
  
  const [segmentContactsList, setSegmentContactsList] = useState<Customer[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);


  const { setPrimaryAction, setSecondaryActionNode, setBreadcrumbNode } = usePageActionContext();

  const openCreateSegmentModal = useCallback(() => {
    setShowCreateSegmentModal(true);
  }, []);

  useEffect(() => {
    if (viewMode === 'list') {
      setPrimaryAction({
        id: 'create-new-segment',
        label: 'Create Segment',
        icon: PlusCircle,
        action: openCreateSegmentModal,
      });
      // Secondary action (filter) is handled by SegmentsDataTable's own effect
      setBreadcrumbNode(null); // Clear breadcrumb when in list view
    } else if (viewMode === 'details' && selectedSegmentForDetails) {
      setPrimaryAction(null); // Or specific actions for detail view like "Import Contacts"
      setSecondaryActionNode(null); // Clear filter when in detail view
      setBreadcrumbNode(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); handleBackToList(); }}>Segments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{selectedSegmentForDetails.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Contacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      );
    }
    return () => {
      // Cleanup actions on unmount or viewMode change if not handled by specific view
      setPrimaryAction(null);
      // setSecondaryActionNode(null); // This is handled by SegmentsDataTable unmount
      setBreadcrumbNode(null);
    };
  }, [viewMode, setPrimaryAction, openCreateSegmentModal, selectedSegmentForDetails, setBreadcrumbNode, setSecondaryActionNode]);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('segments')
        .select('*');

      if (supabaseError) throw supabaseError;
      setSegments(data || []);
    } catch (err) {
      console.error('Error fetching segments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch segments.';
      setError(errorMessage);
      toast({
        title: 'Error Fetching Segments',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []); // Added empty dependency array for useCallback

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast({ title: "Error", description: "Segment name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a segment.", variant: "destructive" });
      return;
    }

    setIsCreatingSegment(true);
    try {
      const { data, error: insertError } = await supabase
        .from('segments')
        .insert([{ name: newSegmentName.trim(), user_id: user.id }]) // Assuming 'user_id' column exists
        .select();

      if (insertError) throw insertError;

      if (data) {
        // setSegments(prevSegments => [...prevSegments, ...data]); // Add new segment to local state
        await fetchSegments(); // Refetch all segments to ensure consistency
        toast({ title: "Success", description: `Segment "${newSegmentName.trim()}" created.` });
        setNewSegmentName('');
        setShowCreateSegmentModal(false);
      }
    } catch (err) {
      console.error('Error creating segment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create segment.';
      toast({
        title: 'Error Creating Segment',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingSegment(false);
      setIsProcessing(false);
    }
  };

  const handleViewSegment = async (segment: Segment) => {
    setSelectedSegmentForDetails(segment);
    setViewMode('details');
    setIsLoadingContacts(true);
    setSegmentContactsList([]); // Clear previous list

    try {
      const { data: segmentContactsData, error: segmentContactsError } = await supabase
        .from('segment_contacts')
        .select('contact_id')
        .eq('segment_id', segment.id);

      if (segmentContactsError) throw segmentContactsError;

      const contactIds = segmentContactsData.map(sc => sc.contact_id);

      if (contactIds.length === 0) {
        setSegmentContactsList([]);
        setIsLoadingContacts(false);
        return;
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from('customers')
        .select('*') // Or specific fields: 'id, name, email'
        .in('id', contactIds);
      
      if (contactsError) throw contactsError;

      setSegmentContactsList(contactsData || []);
    } catch (err) {
      console.error('Error fetching segment contacts:', err);
      toast({ title: 'Error', description: 'Could not load contacts for this segment.', variant: 'destructive' });
      setSegmentContactsList([]); 
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSegmentForDetails(null);
    setSegmentContactsList([]);
    // Breadcrumb and actions will be reset by the useEffect for viewMode 'list'
  };

  const handleOpenEditModal = (segment: Segment) => {
    setEditingSegment(segment);
    setEditedSegmentName(segment.name);
    setShowEditSegmentModal(true);
  };

  const handleUpdateSegment = async () => {
    if (!editingSegment || !editedSegmentName.trim()) {
      toast({ title: "Error", description: "Segment name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsUpdatingSegment(true);
    setIsProcessing(true);
    try {
      const { data, error: updateError } = await supabase
        .from('segments')
        .update({ name: editedSegmentName.trim() })
        .eq('id', editingSegment.id)
        .select();

      if (updateError) throw updateError;

      if (data) {
        await fetchSegments(); // Refetch to update the list
        toast({ title: "Success", description: `Segment "${editedSegmentName.trim()}" updated.` });
        setShowEditSegmentModal(false);
        setEditingSegment(null);
      }
    } catch (err) {
      console.error('Error updating segment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update segment.';
      toast({ title: 'Error Updating Segment', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsUpdatingSegment(false);
      setIsProcessing(false);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this segment? This action cannot be undone.")) {
      return;
    }
    setIsProcessing(true); // Use general processing for delete as well
    try {
      const { error: deleteError } = await supabase
        .from('segments')
        .delete()
        .eq('id', segmentId);

      if (deleteError) throw deleteError;

      await fetchSegments(); // Refetch to update the list
      toast({ title: "Success", description: "Segment deleted." });
    } catch (err) {
      console.error('Error deleting segment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete segment.';
      toast({ title: 'Error Deleting Segment', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContactFromSegment = async (segmentId: string, contactId: string) => {
    if (!window.confirm("Are you sure you want to remove this contact from the segment?")) {
      return;
    }
    setIsDetailViewProcessing(true);
    try {
      const { error } = await supabase
        .from('segment_contacts')
        .delete()
        .eq('segment_id', segmentId)
        .eq('contact_id', contactId);

      if (error) throw error;

      toast({ title: "Success", description: "Contact removed from segment." });
      // Refetch contacts for the current segment view
      if (selectedSegmentForDetails) {
        // Create a temporary function to refetch contacts for the current segment
        // to avoid calling handleViewSegment which might reset viewMode or breadcrumbs unnecessarily
        const refetchCurrentSegmentContacts = async () => {
          setIsLoadingContacts(true);
          try {
            const { data: segmentContactsData, error: segContactsErr } = await supabase
              .from('segment_contacts')
              .select('contact_id')
              .eq('segment_id', selectedSegmentForDetails.id);
            if (segContactsErr) throw segContactsErr;
            const currentContactIds = segmentContactsData.map(sc => sc.contact_id);
            if (currentContactIds.length === 0) {
              setSegmentContactsList([]);
            } else {
              const { data: contactsData, error: cErr } = await supabase
                .from('customers')
                .select('*')
                .in('id', currentContactIds);
              if (cErr) throw cErr;
              setSegmentContactsList(contactsData || []);
            }
          } catch (err) {
            console.error('Error refetching segment contacts:', err);
            toast({ title: 'Error', description: 'Could not refresh contacts list.', variant: 'destructive' });
          } finally {
            setIsLoadingContacts(false);
          }
        };
        await refetchCurrentSegmentContacts();
      }
    } catch (err) {
      console.error('Error removing contact from segment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove contact.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsDetailViewProcessing(false);
    }
  };

  const tableMeta: SegmentsTableMeta = {
    handleViewSegment,
    handleOpenEditModal,
    handleDeleteSegment,
    isProcessing: isProcessing || isCreatingSegment || isUpdatingSegment, // This is for the main segments table
  };

  return (
    <> {/* Using a fragment as the new root */}
      {/* Title and container div removed */}
      {loading && viewMode === 'list' && <p>Loading segments...</p>}
      {error && viewMode === 'list' && <p className="text-red-500">Error: {error}</p>}
      
      {viewMode === 'list' && !loading && !error && (
        segments.length > 0 ? (
          <SegmentsDataTable columns={segmentColumns} data={segments} meta={tableMeta} />
        ) : (
          <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">No segments created yet.</p>
            <Button onClick={openCreateSegmentModal} className="mt-4">
              Create Your First Segment
            </Button>
          </div>
        )
      )}

      {viewMode === 'details' && selectedSegmentForDetails && (
        <SegmentContactsDetailView
          segment={selectedSegmentForDetails}
          contacts={segmentContactsList}
          isLoading={isLoadingContacts}
          onBack={handleBackToList}
          onDeleteContactFromSegment={handleDeleteContactFromSegment}
          isProcessingActions={isDetailViewProcessing}
          onOpenImportModal={() => setShowImportContactsModal(true)} // Pass handler
        />
      )}

      {/* Create Segment Modal */}
      {showCreateSegmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create New Segment</h3>
            <Input
              type="text"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              placeholder="Segment Name"
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
              disabled={isCreatingSegment}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateSegmentModal(false)} disabled={isCreatingSegment}>
                Cancel
              </Button>
              <Button onClick={handleCreateSegment} disabled={isCreatingSegment || !newSegmentName.trim()}>
                {isCreatingSegment ? 'Creating...' : 'Create Segment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Segment Modal */}
      {showEditSegmentModal && editingSegment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit Segment: {editingSegment.name}</h3>
            {/* Input and buttons for Edit Segment Modal... */}
            <Input
              type="text"
              value={editedSegmentName}
              onChange={(e) => setEditedSegmentName(e.target.value)}
              placeholder="New Segment Name"
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
              disabled={isUpdatingSegment}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditSegmentModal(false)} disabled={isUpdatingSegment}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSegment} disabled={isUpdatingSegment || !editedSegmentName.trim() || editedSegmentName.trim() === editingSegment.name}>
                {isUpdatingSegment ? 'Updating...' : 'Update Segment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Segment Details Modal is REMOVED - replaced by SegmentContactsDetailView */}

      {/* Import Contacts to Segment Modal */}
      {showImportContactsModal && selectedSegmentForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Import Contacts to "{selectedSegmentForDetails.name}"</h3>
            <Input
              type="file"
              accept=".csv" // Example: accept CSV files
              onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
              disabled={isImportingContacts}
            />
            {importFile && <p className="text-sm text-muted-foreground mb-2">Selected file: {importFile.name}</p>}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setShowImportContactsModal(false); setImportFile(null);}} disabled={isImportingContacts}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (importFile && selectedSegmentForDetails) {
                    setIsImportingContacts(true);
                    
                    try {
                      // Read the file as text
                      const csvData = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = (e) => reject(e);
                        reader.readAsText(importFile);
                      });

                      console.log("Request body: ", JSON.stringify({
                        csvData, 
                        segmentId: selectedSegmentForDetails.id, 
                        importMode: 'save_new', 
                        duplicateAction: 'add', // Default action
                      }))
                      
                      // Call the segment-handler edge function using direct fetch
                      const response = await fetch(`https://yrnbbkljrdwoyqjpswtv.supabase.co/functions/v1/segment-handler/segments/import-csv`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({
                          csvData,
                          segmentId: selectedSegmentForDetails.id,
                          importMode: 'save_new', // Default mode
                          duplicateAction: 'add', // Default action
                        }),
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to import contacts');
                      }
                      
                      const result = await response.json();
                      
                      toast({ 
                        title: "Import Successful", 
                        description: `Imported ${result.newContactsAdded} new contacts and added ${result.existingContactsAddedToSegment} existing contacts to the segment.`
                      });
                      
                      setShowImportContactsModal(false);
                      setImportFile(null);
                      
                      // Refetch contacts for the segment
                      if (selectedSegmentForDetails) {
                        const refetchCurrentSegmentContacts = async () => {
                          setIsLoadingContacts(true);
                          try {
                            const { data: segmentContactsData, error: segContactsErr } = await supabase
                              .from('segment_contacts')
                              .select('contact_id')
                              .eq('segment_id', selectedSegmentForDetails.id);
                            if (segContactsErr) throw segContactsErr;
                            const currentContactIds = segmentContactsData.map(sc => sc.contact_id);
                            if (currentContactIds.length === 0) {
                              setSegmentContactsList([]);
                            } else {
                              const { data: contactsData, error: cErr } = await supabase
                                .from('customers')
                                .select('*')
                                .in('id', currentContactIds);
                              if (cErr) throw cErr;
                              setSegmentContactsList(contactsData || []);
                            }
                          } catch (err) {
                            console.error('Error refetching segment contacts:', err);
                          } finally {
                            setIsLoadingContacts(false);
                          }
                        };
                        await refetchCurrentSegmentContacts();
                      }
                    } catch (err) {
                      console.error('Error importing contacts:', err);
                      const errorMessage = err instanceof Error ? err.message : 'Failed to import contacts';
                      toast({ 
                        title: "Import Failed", 
                        description: errorMessage, 
                        variant: "destructive" 
                      });
                    } finally {
                      setIsImportingContacts(false);
                    }
                  } else {
                    toast({ title: "Error", description: "Please select a file to import.", variant: "destructive"});
                  }
                }} 
                disabled={isImportingContacts || !importFile}
              >
                {isImportingContacts ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SegmentsPage;
