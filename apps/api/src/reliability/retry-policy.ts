export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRatio: number;
};

export function validateRetryPolicy(policy: RetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }
  if (!Number.isFinite(policy.baseDelayMs) || policy.baseDelayMs <= 0) {
    throw new Error('baseDelayMs must be positive');
  }
  if (
    !Number.isFinite(policy.maxDelayMs) ||
    policy.maxDelayMs < policy.baseDelayMs
  ) {
    throw new Error('maxDelayMs must be at least baseDelayMs');
  }
  if (
    !Number.isFinite(policy.backoffMultiplier) ||
    policy.backoffMultiplier < 1
  ) {
    throw new Error('backoffMultiplier must be at least 1');
  }
  if (
    !Number.isFinite(policy.jitterRatio) ||
    policy.jitterRatio < 0 ||
    policy.jitterRatio > 1
  ) {
    throw new Error('jitterRatio must be between 0 and 1');
  }
}

export function calculateRetryDelayMs(
  attemptNumber: number,
  policy: RetryPolicy,
  jitterUnit = 0.5,
): number {
  validateRetryPolicy(policy);

  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error('attemptNumber must be a positive integer');
  }

  const boundedJitterUnit = Math.min(1, Math.max(0, jitterUnit));
  const exponent = Math.max(0, attemptNumber - 1);
  const exponentialDelay = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * policy.backoffMultiplier ** exponent,
  );
  const jitterRange = exponentialDelay * policy.jitterRatio;
  const jitterOffset = (boundedJitterUnit * 2 - 1) * jitterRange;

  return Math.round(
    Math.min(
      policy.maxDelayMs,
      Math.max(0, exponentialDelay + jitterOffset),
    ),
  );
}
