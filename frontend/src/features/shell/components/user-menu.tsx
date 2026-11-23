import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { type ReactElement, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useCurrentUser, useLogout } from '@/features/auth';
import { InitialsAvatar } from '@/shared/components/initials-avatar';
import { PATHS, settingsPath } from '@/shared/lib/paths';

import { ThemeModeSwitch } from './theme-mode-switch';

const LINKS = [
    { key: 'viewings', to: PATHS.viewings, icon: EventAvailableOutlined },
    { key: 'messages', to: PATHS.messages, icon: ForumOutlined },
    { key: 'profile', to: settingsPath('account'), icon: PersonOutlineOutlined },
    { key: 'securityDevices', to: settingsPath('security'), icon: ShieldOutlined },
    { key: 'settings', to: PATHS.settings, icon: SettingsOutlined },
] as const;

/**
 * The avatar in a pill with a chevron (the name is the button's accessible name); opens the account panel: who is signed in (and for which agency), the
 * theme, links into Settings and Sign out. A dialog rather than a menu, because it holds more than menu items.
 */
export function UserMenu(): ReactElement | null {
    const { t } = useTranslation('shell');
    const { data: user } = useCurrentUser();
    const logout = useLogout();
    const panelId = useId();
    const nameId = useId();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const menuRef = useRef<HTMLUListElement>(null);

    if (!user) {
        return null;
    }
    const fullName = `${user.firstName} ${user.lastName}`;
    const role = t(`role.${user.role}`);
    const close = (): void => {
        setAnchor(null);
    };

    return (
        <>
            <ButtonBase
                aria-label={t('account.open', { name: fullName })}
                aria-haspopup="dialog"
                aria-controls={anchor ? panelId : undefined}
                aria-expanded={anchor ? true : undefined}
                onClick={(event) => {
                    setAnchor(event.currentTarget);
                }}
                className="app-hover-fade min-h-11 gap-1 rounded-full border border-solid border-divider py-1 pr-2 pl-1 hover:bg-action-hover"
            >
                <InitialsAvatar id={user.id} firstName={user.firstName} lastName={user.lastName} />
                <ExpandMoreRounded aria-hidden fontSize="small" className="text-text-secondary" />
            </ButtonBase>
            <Popover
                id={panelId}
                anchorEl={anchor}
                open={anchor !== null}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    transition: {
                        onEntered: () => {
                            menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
                        },
                    },
                    paper: {
                        role: 'dialog',
                        'aria-labelledby': nameId,
                        className: 'w-80',
                    },
                }}
            >
                <div className="flex items-center gap-4 px-4 py-4">
                    <InitialsAvatar id={user.id} firstName={user.firstName} lastName={user.lastName} />
                    <div className="flex min-w-0 flex-col">
                        <Typography id={nameId} variant="subtitle2" component="p" className="truncate">
                            {fullName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" className="truncate">
                            {user.email}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" className="truncate">
                            {user.agency ? t('account.roleAt', { role, agency: user.agency.name }) : role}
                        </Typography>
                        {user.isDemoMode && (
                            <Typography variant="caption" color="textSecondary" className="truncate">
                                {t('account.demoReset')}
                            </Typography>
                        )}
                    </div>
                </div>
                <Divider />
                <div className="flex flex-col gap-2 px-4 py-3">
                    <Typography variant="caption" color="textSecondary" aria-hidden>
                        {t('account.theme')}
                    </Typography>
                    <ThemeModeSwitch label={t('account.theme')} />
                </div>
                <Divider />
                <MenuList ref={menuRef} aria-label={t('account.title')} className="py-1">
                    {LINKS.map(({ key, to, icon: Icon }) => (
                        <MenuItem key={key} component={Link} to={to} onClick={close} className="min-h-11">
                            <ListItemIcon>
                                <Icon aria-hidden fontSize="small" />
                            </ListItemIcon>
                            {t(`account.${key}`)}
                        </MenuItem>
                    ))}
                    <Divider component="li" role="separator" />
                    <MenuItem
                        disabled={logout.isPending}
                        onClick={() => {
                            logout.mutate();
                        }}
                        className="min-h-11"
                    >
                        <ListItemIcon>
                            <LogoutOutlined aria-hidden fontSize="small" />
                        </ListItemIcon>
                        {logout.isPending ? t('account.signingOut') : t('account.signOut')}
                    </MenuItem>
                </MenuList>
            </Popover>
        </>
    );
}
