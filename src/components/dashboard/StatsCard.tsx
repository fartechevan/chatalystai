import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  color?: string;
  subValue?: string | number;
  subLabel?: string;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode; // Added for potential icon display
}

export function StatsCard({
  title,
  value,
  color = "text-primary", // Default to primary color from shadcn
  subValue,
  subLabel,
  children,
  className = "",
  icon,
}: StatsCardProps) {
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs uppercase tracking-wide">
            {title}
          </CardDescription>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <CardTitle className={cn("text-4xl font-bold", color)}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {subValue !== undefined && (
          <div className="text-xs text-muted-foreground">
            <span>{subValue}</span>
            {subLabel && <span> {subLabel}</span>}
          </div>
        )}
        {children}
      </CardContent>
      {/* Optional Footer, can be used for additional info or actions */}
      {/* <CardFooter>
        <p className="text-xs text-muted-foreground">Footer content</p>
      </CardFooter> */}
    </Card>
  );
}
