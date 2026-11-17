import { useState } from 'react';

const STORAGE_KEY = 'keyhaven.sidebar.collapsed';

export interface SidebarCollapsed {
    isCollapsed: boolean;
    toggle: () => void;
}

const readCollapsed = (): boolean => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

const storeCollapsed = (isCollapsed: boolean): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch {
        return;
    }
};

/**
 * The desktop sidebar folded to the icon rail — a per-browser preference in localStorage, not
 * account data; blocked storage (private mode) keeps the choice for the visit only.
 */
export const useSidebarCollapsed = (): SidebarCollapsed => {
    const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
    const toggle = (): void => {
        setIsCollapsed((current) => {
            const next = !current;
            storeCollapsed(next);
            return next;
        });
    };
    return { isCollapsed, toggle };
};
