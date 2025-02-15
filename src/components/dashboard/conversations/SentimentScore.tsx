
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SentimentScoreProps {
  sentiment: 'bad' | 'moderate' | 'good' | null;
  conversationId: string;
  onSentimentUpdate?: (newSentiment: 'bad' | 'moderate' | 'good') => void;
}

export function SentimentScore({ sentiment: initialSentiment, conversationId, onSentimentUpdate }: SentimentScoreProps) {
  const [sentiment, setSentiment] = useState(initialSentiment);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const { toast } = useToast();

  const getPercentage = (sentiment: string | null) => {
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

  const getColor = (sentiment: string | null) => {
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

  const getLabel = (sentiment: string | null) => {
    switch (sentiment) {
      case 'bad':
        return 'Needs improvement';
      case 'moderate':
        return 'Moderately effective';
      case 'good':
        return 'Extremely effective';
      default:
        return 'Not yet rated';
    }
  };

  const refreshSentiment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
        body: { conversationId }
      });

      if (error) throw error;

      setSentiment(data.sentiment);
      setDescription(data.description);
      if (onSentimentUpdate) {
        onSentimentUpdate(data.sentiment);
      }

      toast({
        title: "Sentiment Analysis Updated",
        description: "The conversation has been re-analyzed successfully."
      });
    } catch (error) {
      console.error('Error refreshing sentiment:', error);
      toast({
        title: "Error",
        description: "Failed to update sentiment analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
            }} 
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className="text-2xl font-bold capitalize">{sentiment || 'unrated'}</span>
          <span className="text-sm text-muted-foreground">Rating</span>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <h4 className="text-xl font-semibold">{label}</h4>
        <p className="text-muted-foreground mt-2">
          {description || (sentiment ? 
            `This conversation was ${label.toLowerCase()} at helping customers find what they need.` :
            'This conversation has not been rated yet.')}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={refreshSentiment}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Refresh Rating'}
        </Button>
      </div>
    </Card>
  );
}
