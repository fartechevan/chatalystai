import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface SentimentScoreProps {
  sentiment: 'bad' | 'moderate' | 'good';
}

export function SentimentScore({ sentiment }: SentimentScoreProps) {
  const getPercentage = (sentiment: string) => {
    switch (sentiment) {
      case 'bad':
        return 30;
      case 'moderate':
        return 65;
      case 'good':
        return 97;
      default:
        return 0;
    }
  };

  const getColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bad':
        return 'from-red-500 to-red-600';
      case 'moderate':
        return 'from-yellow-500 to-yellow-600';
      case 'good':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-300 to-gray-400';
    }
  };

  const getLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'bad':
        return 'Needs improvement';
      case 'moderate':
        return 'Moderately effective';
      case 'good':
        return 'Extremely effective';
      default:
        return 'No data available';
    }
  };

  const percentage = getPercentage(sentiment);
  const colorClass = getColor(sentiment);
  const label = getLabel(sentiment);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-semibold">Post Score</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Effectiveness score based on conversation analysis</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="relative w-48 h-24 mx-auto">
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" 
               style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0% 100%)' }} />
        </div>
        <div className="absolute inset-0">
          <div 
            className={`w-full h-full bg-gradient-to-r ${colorClass} rounded-full transform origin-bottom`} 
            style={{ 
              clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0% 100%)',
              transform: `rotate(${percentage * 1.8 - 90}deg)`
            }} 
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className="text-2xl font-bold capitalize">{sentiment}</span>
          <span className="text-sm text-muted-foreground">Rating</span>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <h4 className="text-xl font-semibold">{label}</h4>
        <p className="text-muted-foreground mt-2">
          This conversation was {label.toLowerCase()} at helping customers find what they need.
        </p>
      </div>
    </Card>
  );
}