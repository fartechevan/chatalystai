
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  errorMessage: string;
}

export function ErrorState({ errorMessage }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4 p-4 text-center">
      <AlertCircle className="h-10 w-10 text-red-500" />
      <p className="text-red-600 font-medium">Error Loading Instance</p>
      <p className="text-sm text-gray-600">{errorMessage}</p>
      <Button onClick={() => window.location.reload()} variant="outline">Refresh Page</Button>
    </div>
  );
}
