
import { useState } from "react";
import { DocumentList } from "./DocumentList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, FilePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DocumentSelectionProps {
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  setShowImportForm: (show: boolean) => void;
  setShowCreateDialog: (show: boolean) => void;
}

export function DocumentSelection({
  selectedDocumentId,
  onSelectDocument,
  setShowImportForm,
  setShowCreateDialog
}: DocumentSelectionProps) {
  
  // Ensure this handler explicitly sets showImportForm to true
  const handleShowImportForm = () => {
    setShowImportForm(true);
    console.log("Import form visibility set to:", true);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShowImportForm} className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
              <FilePlus className="h-4 w-4 mr-2" />
              Create New Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h2 className="text-xl font-semibold mb-4">Documents</h2>
      <DocumentList
        onSelectDocument={onSelectDocument}
        selectedDocumentId={selectedDocumentId}
      />
    </div>
  );
}
