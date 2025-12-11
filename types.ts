export type PlanMode = 'enhance' | 'create' | null;

export interface AppState {
  step: 'welcome' | 'input' | 'processing' | 'result';
  mode: PlanMode;
  userInput: string;
  planResult: string;
  error: string | null;
}

export interface PromptContext {
  mode: PlanMode;
  inputData: string;
  detectedType?: string; // For enhancement mode
}
