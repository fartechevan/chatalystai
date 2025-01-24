import { File, FileImage, FileVideo } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatFiles() {
  const fileTypes = [
    {
      type: "Documents",
      count: "126 files",
      size: "19.3MB",
      icon: File,
      color: "bg-blue-100"
    },
    {
      type: "Photos",
      count: "53 files",
      size: "321MB",
      icon: FileImage,
      color: "bg-yellow-100"
    },
    {
      type: "Movies",
      count: "3 files",
      size: "210MB",
      icon: FileVideo,
      color: "bg-green-100"
    }
  ];

  return (
    <div className="w-72 border-l bg-background">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Shared files</h3>
        <p className="text-sm text-muted-foreground">10 members</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-accent">
            <p className="text-2xl font-bold">231</p>
            <p className="text-sm text-muted-foreground">All files</p>
          </div>
          <div className="p-4 rounded-lg bg-accent">
            <p className="text-2xl font-bold">45</p>
            <p className="text-sm text-muted-foreground">All links</p>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-15rem)]">
        <div className="p-4 space-y-4">
          <h4 className="text-sm font-medium">File type</h4>
          {fileTypes.map((file) => (
            <div
              key={file.type}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${file.color}`}>
                <file.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{file.type}</p>
                <p className="text-xs text-muted-foreground">
                  {file.count}, {file.size}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}