/** A native popover stays open when one of its links moves the page to an anchor, so a followed link closes it. */
export const closeMenuOnFollow = (): void => {
    const menu = document.getElementById('mobile-menu');
    menu?.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('a')) {
            menu.hidePopover();
        }
    });
};
