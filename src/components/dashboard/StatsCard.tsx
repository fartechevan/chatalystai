
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  color?: string;
  subValue?: string | number;
  subLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  color = "text-purple-400", 
  subValue, 
  subLabel,
  children,
  className = ""
}: StatsCardProps) {
  return (
    <div className={`rounded-lg bg-blue-950/80 p-4 flex flex-col h-full ${className}`}>
      <div className="font-semibold text-xs uppercase tracking-wide text-white/70 mb-2">
        {title}
      </div>
      <div className={`text-4xl font-bold ${color} my-1`}>
        {value}
      </div>
      {subValue !== undefined && (
        <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
          <span>{subValue}</span>
          {subLabel && <span className="text-white/50">{subLabel}</span>}
        </div>
      )}
      <div className="h-px bg-white/10 my-3"></div>
      <div className="text-green-400 text-sm mt-auto">
        <span className="font-bold">0</span>
        <span className="text-white/50 text-xs ml-1">this month</span>
      </div>
      {children}
    </div>
  );
}
