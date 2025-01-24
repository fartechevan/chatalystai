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
        return 'bg-red-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'good':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
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
        <h3 className="text-xl font-semibold">Conversation Score</h3>
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
      
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white bg-primary">
              {label}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-primary">
              {percentage}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${percentage}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${colorClass}`}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          This conversation was {label.toLowerCase()} based on the sentiment analysis.
        </p>
      </div>
    </Card>
  );
}