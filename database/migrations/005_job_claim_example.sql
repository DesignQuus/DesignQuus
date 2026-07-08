-- 하나의 Transaction 안에서 실행
WITH next_job AS (
    SELECT id
    FROM ops.jobs
    WHERE status = 'QUEUED'
      AND available_at <= now()
    ORDER BY priority ASC, available_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
UPDATE ops.jobs AS j
SET status = 'RUNNING',
    locked_at = now(),
    locked_by = :worker_id,
    attempt_count = attempt_count + 1
FROM next_job
WHERE j.id = next_job.id
RETURNING j.*;
