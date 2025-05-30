
import { ScrollArea } from "@/components/ui/scroll-area";

export function CompanyList() {
  return (
    // The parent div in ListsView now has p-4 or p-6, so this ScrollArea will fill that.
    // The h-[calc(100vh-10rem)] might be too specific and could conflict with flex layout.
    // Let's make it fill the available height within the flex container.
    <ScrollArea className="h-full"> 
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {/* Removed p-4 as parent provides padding. Centering content. */}
        Coming soon...
      </div>
    </ScrollArea>
  );
}
