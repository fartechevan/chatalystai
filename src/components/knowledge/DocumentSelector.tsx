import React, { useState } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';
import { KnowledgeDocument } from '@/services/knowledge/documentService';

interface DocumentSelectorProps {
  availableDocuments: KnowledgeDocument[] | undefined;
  selectedDocumentIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  disabled?: boolean;
  placeholder?: string;
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  availableDocuments = [], // Default to empty array
  selectedDocumentIds,
  onSelectionChange,
  isLoading = false,
  isError = false,
  error = null,
  disabled = false,
  placeholder = "Select documents...",
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (documentId: string) => {
    const newSelectedIds = selectedDocumentIds.includes(documentId)
      ? selectedDocumentIds.filter(id => id !== documentId) // Deselect
      : [...selectedDocumentIds, documentId]; // Select
    onSelectionChange(newSelectedIds);
  };

  const selectedDocuments = availableDocuments.filter(doc => selectedDocumentIds.includes(doc.id));

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="my-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Documents</AlertTitle>
        <AlertDescription>
          {error?.message || "Could not fetch knowledge documents."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10" // Allow button to grow height
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selectedDocuments.length > 0 ? (
              selectedDocuments.map(doc => (
                <Badge key={doc.id} variant="secondary" className="whitespace-nowrap">
                  {doc.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search documents..." disabled={disabled} />
          <CommandList>
            <CommandEmpty>No documents found.</CommandEmpty>
            <CommandGroup>
              {availableDocuments.map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={doc.name} // Use name for searching
                  onSelect={() => handleSelect(doc.id)}
                  disabled={disabled}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedDocumentIds.includes(doc.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {doc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentSelector;
