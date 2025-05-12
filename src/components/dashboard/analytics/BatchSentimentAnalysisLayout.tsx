import React, { useState } from 'react';
import BatchSentimentHistoryList from './BatchSentimentHistoryList';
import BatchSentimentDetailsView from './BatchSentimentDetailsView';

const BatchSentimentAnalysisLayout: React.FC = () => {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const handleSelectAnalysis = (id: string | null) => {
    setSelectedAnalysisId(id);
  };

  return (
    <div className="flex h-[calc(100vh-theme(space.24))] gap-4 p-4"> {/* Adjust height as needed */}
      {/* Left Panel: History List */}
      <div className="w-1/3 h-full">
        <BatchSentimentHistoryList
          selectedAnalysisId={selectedAnalysisId}
          onSelectAnalysis={handleSelectAnalysis}
        />
      </div>

      {/* Right Panel: Details View */}
      <div className="w-2/3 h-full">
        <BatchSentimentDetailsView analysisId={selectedAnalysisId} />
      </div>
    </div>
  );
};

export default BatchSentimentAnalysisLayout;
