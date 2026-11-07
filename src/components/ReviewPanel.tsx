import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchReview, regenerateReview } from "@/api/reviews";
import type { KeyMoment } from "@/types/reviews";
import { POLLING } from "@/lib/polling";

interface Props {
  gameId: string;
  analysisStatus: string;
}

function KeyMomentCard({ moment }: { moment: KeyMoment }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
      <p className="font-medium">
        Move {Math.ceil(moment.ply / 2)}. <span className="font-mono">{moment.san}</span>
      </p>
      <p className="mt-1 text-muted-foreground">{moment.what_happened}</p>
      <p className="mt-1">
        <span className="font-medium">Better: </span>
        <span className="font-mono">{moment.better_move}</span>
      </p>
      <p className="mt-1 italic text-muted-foreground">{moment.lesson}</p>
    </div>
  );
}

export default function ReviewPanel({ gameId, analysisStatus }: Props) {
  const queryClient = useQueryClient();

  const reviewQuery = useQuery({
    queryKey: ["review", gameId],
    queryFn: () => fetchReview(gameId),
    enabled: analysisStatus === "done",
    // Poll while no review exists (waiting for worker to generate it)
    refetchInterval: (q) => (q.state.data === null ? POLLING.JOB_SUMMARY : false),
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateReview(gameId),
    onSuccess: () => {
      // Invalidate to start polling again
      queryClient.setQueryData(["review", gameId], null);
    },
  });

  if (analysisStatus !== "done") {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Analysis required before a review can be generated.
      </div>
    );
  }

  if (reviewQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading review…</div>;
  }

  if (!reviewQuery.data) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          No review yet.{" "}
          <span className="animate-pulse">Generating…</span>
        </p>
      </div>
    );
  }

  const review = reviewQuery.data;
  const rj = review.reviewJson;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {review.model} · v{review.promptVersion}
          </span>
          {review.validationStatus === "flagged" && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
              ⚠ flagged
            </span>
          )}
        </div>
        <button
          onClick={() => regenMutation.mutate()}
          disabled={regenMutation.isPending}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40"
        >
          {regenMutation.isPending ? "Queuing…" : "Regenerate"}
        </button>
      </div>

      {rj ? (
        <>
          {/* Summary */}
          <div className="rounded-lg border p-4">
            <p className="text-sm leading-relaxed">{rj.summary}</p>
            <p className="mt-2 text-sm text-muted-foreground">{rj.result_explanation}</p>
          </div>

          {/* Key moments */}
          {rj.key_moments?.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Key Moments
              </h3>
              <div className="space-y-2">
                {rj.key_moments.map((km, i) => (
                  <KeyMomentCard key={i} moment={km} />
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {rj.strengths?.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What You Did Well
              </h3>
              <ul className="space-y-1 text-sm">
                {rj.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Habit to fix + practice suggestion */}
          {rj.habit_to_fix && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
              <p className="font-medium text-blue-800">Habit to fix</p>
              <p className="mt-1 text-blue-700">{rj.habit_to_fix}</p>
              {rj.practice_suggestion && (
                <p className="mt-2 text-blue-600 italic">{rj.practice_suggestion}</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{review.reviewText}</p>
      )}
    </div>
  );
}
