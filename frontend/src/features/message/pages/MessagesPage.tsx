import ForumOutlined from '@mui/icons-material/ForumOutlined';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageHeadingFocus } from '@/shared/hooks/usePageHeadingFocus';
import { cn } from '@/shared/lib/cn';
import { ConversationList } from '../components/ConversationList';
import { ConversationPane } from '../components/ConversationPane';

/**
 * `/messages` and `/messages/:conversationId`: the inbox beside the open conversation from `md`; a
 * phone shows one or the other (the thread's header has the way back).
 */
export default function MessagesPage() {
  const { t } = useTranslation('message');
  const { conversationId } = useParams<{ conversationId: string }>();
  const open = conversationId ?? null;
  useDocumentTitle(t('pageTitle'));
  const headingRef = usePageHeadingFocus<HTMLHeadingElement>();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className={cn('flex flex-col gap-1', open && 'sr-only md:not-sr-only')}>
        <Typography
          ref={headingRef}
          tabIndex={-1}
          variant="h4"
          component="h1"
          className="outline-none"
        >
          {t('title')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('subtitle')}
        </Typography>
      </div>
      {/* The arbitrary heights: the pane fills what the viewport leaves under the shell's top bar
          and the heading (and, on a phone, over the bottom bar), so the thread scrolls inside. */}
      <Card
        variant="outlined"
        className={cn(
          'flex overflow-hidden md:h-[calc(100dvh-14rem)] md:min-h-[24rem]',
          open
            ? 'h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))]'
            : 'h-auto md:h-[calc(100dvh-14rem)]',
        )}
      >
        <aside
          aria-label={t('inbox.title')}
          className={cn(
            'flex min-h-0 w-full flex-col md:w-80 md:shrink-0 md:border-r md:border-divider lg:w-96',
            open && 'hidden md:flex',
          )}
        >
          <ConversationList selectedId={open} />
        </aside>
        <section
          aria-label={t('thread.label')}
          className={cn('flex min-w-0 flex-1 flex-col', !open && 'hidden md:flex')}
        >
          {open ? (
            <ConversationPane key={open} conversationId={open} />
          ) : (
            <div className="m-auto flex max-w-sm flex-col items-center gap-2 px-4 text-center">
              <ForumOutlined aria-hidden fontSize="large" color="disabled" />
              <Typography variant="subtitle1" component="p">
                {t('thread.pick')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t('thread.pickHint')}
              </Typography>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
