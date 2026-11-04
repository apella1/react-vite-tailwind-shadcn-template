export interface WorkerStatus {
  status: "ok" | "stale" | "down";
  lastSeenSeconds: number | null;
  details: {
    ollamaReachable?: boolean;
    currentJobId?: string;
    currentJobKind?: string;
  };
}

export interface StatusResponse {
  api: "ok" | "down";
  database: "ok" | "down";
  worker: WorkerStatus;
  ollama: "ok" | "down" | "unknown";
}
