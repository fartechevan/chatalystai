
interface LeadSourcesSectionProps {
  className?: string;
}

export function LeadSourcesSection({ className = "" }: LeadSourcesSectionProps) {
  return (
    <div className={`rounded-lg bg-blue-950/80 p-4 flex flex-col h-full ${className}`}>
      <div className="font-semibold text-xs uppercase tracking-wide text-white/70 mb-2">
        LEAD SOURCES
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="text-yellow-400 text-sm">⚠️ Not enough data to display</span>
          <div className="w-36 h-36 border-4 border-dashed border-gray-500/20 rounded-full mx-auto mt-4 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-blue-500/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
