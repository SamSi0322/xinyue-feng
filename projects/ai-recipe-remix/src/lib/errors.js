/** An error whose message is written for people and is safe to show in the UI. */
export class FriendlyError extends Error {
  constructor(message, { retryable = true, status } = {}) {
    super(message);
    this.name = 'FriendlyError';
    this.retryable = retryable;
    this.status = status;
  }
}

export const GENERIC_ERROR = 'Something went wrong while cooking up recipes. Please try again.';

/** Never show raw exception text (stack traces, TypeErrors, ...) to visitors. */
export function toUserError(error) {
  if (error instanceof FriendlyError) return { message: error.message, retryable: error.retryable };
  return { message: GENERIC_ERROR, retryable: true };
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
