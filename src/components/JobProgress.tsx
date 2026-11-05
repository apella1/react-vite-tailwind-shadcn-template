import { useQuery } from "@tanstack/react-query";
import { fetchJobSummary } from "@/api/jobs";
import { POLLING } from "@/lib/polling";

/**
 * Inline job progress indicator for the Games page.
 * Shows pending/running/done/failed counts while analysis jobs are active.
 * Stops polling when there are no pending or running jobs.
 */
export default function JobProgress() {
  const { data } = useQuery({
    queryKey: ["job-summary"],
    queryFn: fetchJobSummary,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return POLLING.JOB_SUMMARY;
      const { pending, running } = d.total;
      return pending > 0 || running > 0 ? POLLING.JOB_SUMMARY : false;
    },
  });

  if (!data) return null;
  const { pending, running, done, failed } = data.total;

  if (pending === 0 && running === 0 && done === 0 && failed === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs">
      {running > 0 && (
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span className="font-medium text-blue-600">{running} analyzing</span>
        </span>
      )}
      {pending > 0 && (
        <span className="text-muted-foreground">{pending} queued</span>
      )}
      {done > 0 && (
        <span className="text-green-600">{done} done</span>
      )}
      {failed > 0 && (
        <span className="text-red-600">{failed} failed</span>
      )}
    </div>
  );
}
