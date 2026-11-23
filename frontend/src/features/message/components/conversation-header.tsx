import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

import { useAccess } from '@/features/auth';
import { displayStatus, ViewingStatusBadge } from '@/features/viewing';
import { BrandMark } from '@/shared/components/brand-mark';
import { InitialsAvatar } from '@/shared/components/initials-avatar';
import { StatusBadge } from '@/shared/components/status-badge';
import { PATHS } from '@/shared/lib/paths';

import { splitName } from '../format';
import type { SetConversationClosedMutation } from '../hooks/use-message-queries';
import type { ConversationDetail } from '../types';

export interface ConversationHeaderProps {
    conversation: ConversationDetail;
    homeHref: string | undefined;
    now: number;
    setClosed: SetConversationClosedMutation;
}

/**
 * Who is on the other end and what it is about — a viewing's home, or a request's subject. The
 * way back to the inbox exists on phones only, where the pane replaces the list. The staff closes
 * and reopens a request from here.
 */
export function ConversationHeader({ conversation, homeHref, now, setClosed }: ConversationHeaderProps): ReactElement {
    const { t } = useTranslation('message');
    const { canAccess } = useAccess();
    const isSupport = conversation.kind === 'SUPPORT';
    const { counterpart, listing } = conversation;
    const { firstName, lastName } = splitName(counterpart.name);
    return (
        <header className="flex items-center gap-4 border-b border-divider px-3 py-2.5 md:px-4">
            <IconButton component={RouterLink} to={PATHS.messages} aria-label={t('thread.back')} className="md:hidden">
                <ArrowBackOutlined aria-hidden />
            </IconButton>
            {counterpart.kind === 'KEYHAVEN' ? (
                <BrandMark className="size-9" />
            ) : (
                <InitialsAvatar id={counterpart.name} firstName={firstName} lastName={lastName} />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                <Typography variant="subtitle1" component="h2" className="truncate">
                    {counterpart.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" className="truncate">
                    {t(`thread.kind.${counterpart.kind}`)}
                    {isSupport && conversation.support && ` · ${conversation.support.subject}`}
                    {!isSupport && listing && homeHref && (
                        <>
                            {' · '}
                            <Link component={RouterLink} to={homeHref} underline="hover" color="inherit">
                                {listing.title}
                            </Link>
                        </>
                    )}
                </Typography>
            </div>
            {conversation.viewing && (
                <ViewingStatusBadge status={displayStatus(conversation.viewing, now)} className="shrink-0" />
            )}
            {isSupport && (
                <StatusBadge
                    tone={conversation.isOpen ? 'success' : 'neutral'}
                    label={conversation.isOpen ? t('thread.open') : t('thread.closedBadge')}
                    className="shrink-0"
                />
            )}
            {isSupport && canAccess('message.manage') && (
                <Button
                    size="small"
                    variant={conversation.isOpen ? 'outlined' : 'contained'}
                    loading={setClosed.isPending}
                    onClick={() => {
                        setClosed.mutate({ conversationId: conversation.id, isClosed: conversation.isOpen });
                    }}
                    className="shrink-0"
                >
                    {conversation.isOpen ? t('thread.close') : t('thread.reopen')}
                </Button>
            )}
        </header>
    );
}
