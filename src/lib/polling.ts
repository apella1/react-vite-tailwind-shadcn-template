/**
 * Polling intervals in milliseconds.
 * All polling intervals are defined here so they can be changed in one place.
 */
export const POLLING = {
  /** Worker status and service health on the Status page */
  STATUS_PAGE: 10_000,
  /** Job progress summary while jobs are pending or running */
  JOB_SUMMARY: 3_000,
  /** Sync progress while a sync is running */
  SYNC_PROGRESS: 2_000,
} as const;
