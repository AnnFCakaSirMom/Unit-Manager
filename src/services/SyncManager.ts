/**
 * SyncManager.ts
 *
 * Centralized service for managing all Supabase read-synchronization.
 *
 * Responsibilities:
 *  - Debouncing (200ms) to batch rapid consecutive triggers into a single fetch.
 *  - "Latest-Request-Wins" via AbortController: if a new sync of the same type
 *    is triggered while a previous one is still in-flight, the previous request
 *    is aborted and only the latest result is applied to the Redux store.
 *  - Loading state broadcasting via a callback, allowing React hooks to subscribe
 *    without creating circular dependencies on this service.
 */

export type SyncType = 'players' | 'groups' | 'twData' | 'twImport' | `player-${string}`;

type LoadingCallback = (isLoading: boolean) => void;

const DEBOUNCE_MS = 200;

class SyncManager {
    /** Active AbortControllers per SyncType. */
    private controllers: Partial<Record<SyncType, AbortController>> = {};

    /** Active debounce timers per SyncType. */
    private timers: Partial<Record<SyncType, ReturnType<typeof setTimeout>>> = {};

    /** Number of in-flight requests, used to derive a global loading state. */
    private activeCount = 0;

    /** External callback subscribed by a React hook to react to loading changes. */
    private loadingCallback: LoadingCallback | null = null;

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Triggers a debounced, abort-safe sync for the given type.
     *
     * @param type   - The category of data being synced.
     * @param action - An async factory that accepts an AbortSignal and performs
     *                 the fetch + dispatch. It must propagate the signal to all
     *                 underlying Supabase queries via .abortSignal(signal).
     */
    public triggerSync(type: SyncType, action: (signal: AbortSignal) => Promise<void>): void {
        // Clear any pending debounce timer for this type.
        const existingTimer = this.timers[type];
        if (existingTimer !== undefined) {
            clearTimeout(existingTimer);
        }

        // Schedule the actual execution after the debounce window.
        this.timers[type] = setTimeout(() => {
            void this.executeLatest(type, action);
        }, DEBOUNCE_MS);
    }

    /**
     * Registers a callback that is invoked whenever the global loading state
     * changes. Pass null to unsubscribe (e.g., on hook cleanup).
     *
     * @param cb - Callback receiving true when any sync is in-flight, false when idle.
     */
    public setLoadingCallback(cb: LoadingCallback | null): void {
        this.loadingCallback = cb;
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Aborts any in-flight request of the same type, then executes the new action.
     * AbortError is swallowed silently — it is expected and benign.
     */
    private async executeLatest(
        type: SyncType,
        action: (signal: AbortSignal) => Promise<void>
    ): Promise<void> {
        // Abort the previous in-flight request of this type, if any.
        const previous = this.controllers[type];
        if (previous) {
            previous.abort();
        }

        // Create a fresh controller for this request.
        const controller = new AbortController();
        this.controllers[type] = controller;

        this.incrementActive();

        try {
            await action(controller.signal);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log(`[SyncManager] "${type}" sync superseded by a newer request — result discarded.`);
                return; // Silently discard; the newer request will apply the data.
            }
            console.warn(`[SyncManager] Unhandled error during "${type}" sync:`, error);
        } finally {
            // Only clean up if this controller is still the current one
            // (i.e. it wasn't already replaced by a newer request).
            if (this.controllers[type] === controller) {
                delete this.controllers[type];
            }
            this.decrementActive();
        }
    }

    private incrementActive(): void {
        this.activeCount++;
        if (this.activeCount === 1) {
            this.loadingCallback?.(true);
        }
    }

    private decrementActive(): void {
        if (this.activeCount > 0) this.activeCount--;
        if (this.activeCount === 0) {
            this.loadingCallback?.(false);
        }
    }
}

/** Singleton instance — import this directly across the codebase. */
export const syncManager = new SyncManager();
