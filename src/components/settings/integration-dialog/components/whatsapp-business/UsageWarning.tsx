
import { AlertCircle } from "lucide-react";

export function UsageWarning() {
  return (
    <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-800">
            Don't forget to use your phone at least <strong>once every 14 days</strong> to stay connected.
          </p>
        </div>
      </div>
    </div>
  );
}
