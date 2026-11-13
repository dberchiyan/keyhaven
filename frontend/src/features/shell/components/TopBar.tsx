import MenuOutlined from '@mui/icons-material/MenuOutlined';
import IconButton from '@mui/material/IconButton';
import { useTranslation } from 'react-i18next';
import { UserMenu } from './UserMenu';

export interface TopBarProps {
  /** Present on mobile only, where the menu is a temporary drawer. */
  onOpenMenu?: () => void;
  menuButtonId: string;
  isMenuOpen: boolean;
}

export function TopBar({ onOpenMenu, menuButtonId, isMenuOpen }: TopBarProps) {
  const { t } = useTranslation('shell');
  return (
    // A paper band with a warm hairline and a faint shadow, so the bar reads as its own surface
    // above the cream page; the controls sit in the page's content column (as <main>).
    <header className="sticky top-0 z-20 flex h-top-bar-height shrink-0 border-b border-divider bg-background-paper px-4 shadow-[0_1px_2px_var(--mui-palette-shadow-soft)] md:px-8">
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
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
