import {
  calculateRetryDelayMs,
  validateRetryPolicy,
  type RetryPolicy,
} from './retry-policy';

const policy: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 500,
  backoffMultiplier: 2,
  jitterRatio: 0,
};

describe('retry policy', () => {
  it('calculates exponential backoff and caps at maxDelayMs', () => {
    expect(calculateRetryDelayMs(1, policy)).toBe(100);
    expect(calculateRetryDelayMs(2, policy)).toBe(200);
    expect(calculateRetryDelayMs(3, policy)).toBe(400);
    expect(calculateRetryDelayMs(4, policy)).toBe(500);
    expect(calculateRetryDelayMs(8, policy)).toBe(500);
  });

  it('applies deterministic jitter within the configured range', () => {
    const jitterPolicy = { ...policy, baseDelayMs: 1000, maxDelayMs: 5000, jitterRatio: 0.2 };
    expect(calculateRetryDelayMs(1, jitterPolicy, 0)).toBe(800);
    expect(calculateRetryDelayMs(1, jitterPolicy, 0.5)).toBe(1000);
    expect(calculateRetryDelayMs(1, jitterPolicy, 1)).toBe(1200);
  });

  it('rejects invalid retry policies and attempt numbers', () => {
    expect(() => validateRetryPolicy({ ...policy, maxAttempts: 0 })).toThrow();
    expect(() => calculateRetryDelayMs(0, policy)).toThrow();
  });
});
