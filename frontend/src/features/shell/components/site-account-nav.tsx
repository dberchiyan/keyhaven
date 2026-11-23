import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess } from '@/features/auth';
import { useUnreadMessages } from '@/features/message';
import { PATHS } from '@/shared/lib/paths';

import { SiteNavLink } from './site-nav-link';

/**
 * The signed-in person's own places on the public site, as one group beside the account menu; from `sm` only, phones
 * have the tab bar (RESP-4). Which places show is decided by `ACCESS` (ARCH-37).
 */
export function SiteAccountNav(): ReactElement {
    const { t } = useTranslation('shell');
    const { canAccess } = useAccess();
    const unread = useUnreadMessages();
    const count = unread.data?.unread ?? 0;
    return (
        <nav aria-label={t('site.yours')} className="hidden sm:block">
            <ul className="m-0 flex list-none items-center gap-2 p-0">
                {canAccess('section.saved') && (
                    <li className="flex">
                        <SiteNavLink
                            to={PATHS.saved}
                            icon={<FavoriteBorderRounded fontSize="small" />}
                            label={t('site.saved')}
                        />
                    </li>
                )}
                {canAccess('viewing.book') && (
                    <li className="flex">
                        <SiteNavLink
                            to={PATHS.viewings}
                            icon={<EventAvailableOutlined fontSize="small" />}
                            label={t('site.viewings')}
                        />
                    </li>
                )}
                {canAccess('viewing.book') && (
                    <li className="flex">
                        <SiteNavLink
                            to={PATHS.messages}
                            icon={<ChatBubbleOutlineRounded fontSize="small" />}
                            label={t('site.messages')}
                            count={count}
                            countLabel={t('site.messagesUnread', { count })}
                        />
                    </li>
                )}
                {canAccess('home.manage') && (
                    <li className="flex">
                        <SiteNavLink
                            to={PATHS.home}
                            icon={<SpaceDashboardOutlined fontSize="small" />}
                            label={t('site.dashboard')}
                        />
                    </li>
                )}
            </ul>
        </nav>
    );
}
