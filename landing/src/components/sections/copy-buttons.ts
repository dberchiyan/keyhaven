const LABEL_RESET_MS = 1600;

/** Writes one value to the clipboard; a refused clipboard leaves the value on screen to copy by hand. */
const copy = async (button: HTMLButtonElement, status: HTMLElement | null): Promise<void> => {
    const value = button.dataset['copy'];
    if (!value) {
        return;
    }
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        return;
    }
    const label = button.querySelector('.copy-label');
    if (label && status) {
        label.textContent = status.dataset['copiedLabel'] ?? '';
        setTimeout(() => {
            label.textContent = status.dataset['copyLabel'] ?? '';
        }, LABEL_RESET_MS);
    }
    if (status) {
        status.textContent = button.dataset['copyStatus'] ?? '';
    }
};

/** The demo's copy buttons; every word comes from the markup's data attributes, which come from `content/`. */
export const wireCopyButtons = (): void => {
    const status = document.getElementById('copy-status');
    for (const button of document.querySelectorAll<HTMLButtonElement>('button.copy')) {
        button.addEventListener('click', () => {
            void copy(button, status);
        });
    }
};
