
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function ChatFiles() {
  const files = [
    {
      id: "1",
      name: "Project Brief.pdf",
      size: "2.4 MB",
      date: "2024-02-20"
    },
    {
      id: "2",
      name: "Meeting Notes.docx",
      size: "1.1 MB",
      date: "2024-02-19"
    }
  ];

  return (
    <div className="w-64 border-l bg-background p-4 hidden lg:block">
      <h3 className="font-semibold mb-4">Shared Files</h3>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-2">
          {files.map((file) => (
            <Button
              key={file.id}
              variant="ghost"
              className="w-full justify-start text-left"
            >
              <FileText className="mr-2 h-4 w-4" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.size} • {file.date}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
