import { useQuery } from "@tanstack/react-query";
import { fetchStatus } from "@/api/status";
import { POLLING } from "@/lib/polling";
import type { OllamaStatus, StatusResponse } from "@/types/status";

type ServiceLevel = "ok" | "stale" | "down" | "model_not_ready" | "unknown";

interface BadgeProps {
  status: ServiceLevel;
}

function StatusBadge({ status }: BadgeProps) {
  const styles: Record<ServiceLevel, string> = {
    ok: "bg-green-100 text-green-800 border-green-300",
    stale: "bg-yellow-100 text-yellow-800 border-yellow-300",
    down: "bg-red-100 text-red-800 border-red-300",
    model_not_ready: "bg-amber-100 text-amber-800 border-amber-300",
    unknown: "bg-gray-100 text-gray-600 border-gray-300",
  };
  const labels: Record<ServiceLevel, string> = {
    ok: "ok",
    stale: "stale",
    down: "down",
    model_not_ready: "downloading",
    unknown: "unknown",
  };
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

interface ServiceRowProps {
  name: string;
  status: ServiceLevel;
  detail?: string;
}

function ServiceRow({ name, status, detail }: ServiceRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <p className="font-medium">{name}</p>
        {detail && <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>}
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

function buildWorkerDetail(data: StatusResponse): string | undefined {
  const { worker } = data;
  if (worker.status === "down") return "No heartbeat received";
  if (worker.lastSeenSeconds != null) {
    const base = `Last heartbeat ${worker.lastSeenSeconds}s ago`;
    const job = worker.details.currentJobKind;
    return job ? `${base} · Running: ${job}` : base;
  }
  return undefined;
}

function buildOllamaDetail(ollama: OllamaStatus): string | undefined {
  const modelLabel = ollama.model ? `Model: ${ollama.model}` : null;
  if (ollama.status === "ok") return modelLabel ?? undefined;
  // For all non-ok states, show the detail from the API, with model name appended if known
  const parts = [ollama.detail, modelLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export default function StatusPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ["status"],
    queryFn: fetchStatus,
    refetchInterval: POLLING.STATUS_PAGE,
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chess Trainer</h1>
        <p className="mt-1 text-sm text-muted-foreground">System status</p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Checking services…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not reach the API. Is the server running?
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <ServiceRow name="API" status={data.api} />
          <ServiceRow name="Database" status={data.database} />
          <ServiceRow
            name="Worker"
            status={data.worker.status}
            detail={buildWorkerDetail(data)}
          />
          <ServiceRow
            name={`Ollama${data.ollama.model ? ` (${data.ollama.model})` : ""}`}
            status={data.ollama.status}
            detail={buildOllamaDetail(data.ollama)}
          />
        </div>
      )}

      {dataUpdatedAt > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()} · refreshes every{" "}
          {POLLING.STATUS_PAGE / 1000}s
        </p>
      )}
    </div>
  );
}
