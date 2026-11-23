interface ApiActivityClock {
    mark: () => void;
    lastAt: () => number;
}

const createApiActivityClock = (): ApiActivityClock => {
    const state = { lastAt: Date.now() };
    return {
        mark: () => {
            state.lastAt = Date.now();
        },
        lastAt: () => state.lastAt,
    };
};

const clock = createApiActivityClock();

/**
 * Called on every API answer: the server counts a session's idle time from its last request, so
 * the idle warning (NAV-3) measures from here.
 */
export const markApiActivity = (): void => {
    clock.mark();
};

/** The instant (ms) of the last API answer — the base of the idle-timeout countdown. */
export const lastApiActivity = (): number => clock.lastAt();
