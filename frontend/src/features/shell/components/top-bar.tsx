import MenuOutlined from '@mui/icons-material/MenuOutlined';
import IconButton from '@mui/material/IconButton';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { UserMenu } from './user-menu';

export interface TopBarProps {
    onOpenMenu?: () => void;
    menuButtonId: string;
    isMenuOpen: boolean;
}

export function TopBar({ onOpenMenu, menuButtonId, isMenuOpen }: TopBarProps): ReactElement {
    const { t } = useTranslation('shell');
    return (
        <header className="sticky top-0 z-20 flex h-top-bar-height shrink-0 border-b border-divider bg-background-paper px-4 shadow-bar md:px-8">
            <div className="mx-auto flex w-full max-w-page items-center gap-2">
                {onOpenMenu && (
                    <IconButton
                        id={menuButtonId}
                        aria-label={t('menu.open')}
                        aria-expanded={isMenuOpen}
                        onClick={onOpenMenu}
                        edge="start"
                    >
                        <MenuOutlined aria-hidden />
                    </IconButton>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
