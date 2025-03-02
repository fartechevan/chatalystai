
export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  pipeline_id?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  is_default?: boolean;
  stages?: PipelineStage[];
}
