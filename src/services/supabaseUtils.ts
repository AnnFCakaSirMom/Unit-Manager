/**
 * supabaseUtils.ts
 * Common utilities for handling Supabase responses, error logging,
 * and AbortSignal management to keep service code DRY.
 */

/**
 * handleQuery
 * Wraps a Supabase SELECT query. Handles boilerplate error checking,
 * AbortError re-throwing, and provides a typed fallback.
 * 
 * @template T - The expected return type (e.g., Array or Object)
 */
export async function handleQuery<T>(
  promise: PromiseLike<{ data: T | null; error: any }>,
  context: { service: string; op: string },
  fallback: T
): Promise<T> {
  const { data, error } = await promise;

  if (error) {
    // Re-throw AbortErrors so SyncManager can handle them correctly
    if (error.message?.includes('abort') || error.name === 'AbortError') {
      const e = new Error('AbortError');
      e.name = 'AbortError';
      throw e;
    }
    
    console.warn(`[${context.service}] ${context.op} failed:`, error.message);
    return fallback;
  }

  return (data as T) ?? fallback;
}

/**
 * handleMutation
 * Wraps a Supabase mutation (INSERT, UPDATE, UPSERT, DELETE).
 * Returns true on success, logs error and returns false on failure.
 */
export async function handleMutation(
  promise: PromiseLike<{ error: any }>,
  context: { service: string; op: string }
): Promise<boolean> {
  const { error } = await promise;

  if (error) {
    console.error(`[${context.service}] ${context.op} failed:`, error.message);
    return false;
  }

  return true;
}

