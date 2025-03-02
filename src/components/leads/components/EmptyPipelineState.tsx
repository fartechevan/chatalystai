
import React from "react";

export function EmptyPipelineState() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Select a Pipeline
        </h2>
        <p className="text-muted-foreground mt-2">
          Choose a pipeline from the sidebar to view and manage your leads.
        </p>
      </div>
    </div>
  );
}
