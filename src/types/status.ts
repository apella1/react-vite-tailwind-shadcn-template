export interface WorkerStatus {
  status: "ok" | "stale" | "down";
  lastSeenSeconds: number | null;
  details: {
    ollamaReachable?: boolean;
    ollamaModelReady?: boolean;
    ollamaModel?: string;
    currentJobId?: string;
    currentJobKind?: string;
  };
}

export interface OllamaStatus {
  status: "ok" | "down" | "model_not_ready" | "unknown";
  model: string | null;
  detail: string | null;
}

export interface StatusResponse {
  api: "ok" | "down";
  database: "ok" | "down";
  worker: WorkerStatus;
  ollama: OllamaStatus;
}
