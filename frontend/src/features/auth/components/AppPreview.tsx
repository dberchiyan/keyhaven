import Paper from '@mui/material/Paper';
import { m, useReducedMotion } from 'motion/react';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/shared/lib/cn';

/** Listing cards: a photo tone, a title width and a status pill tone. */
const CARDS = [
    { id: 'card-1', photo: 'bg-avatar-c2', title: 'w-3/5', pill: 'success' },
    { id: 'card-2', photo: 'bg-avatar-c5', title: 'w-1/2', pill: 'success' },
    { id: 'card-3', photo: 'bg-avatar-c8', title: 'w-2/3', pill: 'warning' },
    { id: 'card-4', photo: 'bg-avatar-c6', title: 'w-1/2', pill: 'success' },
    { id: 'card-5', photo: 'bg-avatar-c1', title: 'w-3/5', pill: 'neutral' },
    { id: 'card-6', photo: 'bg-avatar-c3', title: 'w-1/2', pill: 'success' },
] as const;
const FILTERS = ['w-16', 'w-20', 'w-14'] as const;

const PILL = {
    success: 'bg-status-success-background',
    warning: 'bg-status-warning-background',
    neutral: 'bg-status-neutral-background',
} as const;

/** A text line in the preview: no words, just its shape. */
const Line = ({ className }: { className: string }) => <div className={cn('h-2 rounded-full', className)} />;

/**
 * Decorative product preview beside the sign-in card (desktop only): the search page's shapes —
 * a filter row and a grid of listing cards. Motion comes from the page's LazyMotion.
 */
export function AppPreview() {
    const reduce = useReducedMotion();
    return (
        <m.div
            aria-hidden
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            className="relative hidden w-full max-w-2xl self-center lg:block"
        >
            <Paper elevation={12} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
                    <BrandMark className="size-6" />
                    <span className="h-5 w-1/3 rounded-full bg-background" />
                    <span className="ml-auto size-6 rounded-full bg-avatar-c4" />
                </div>
                <div className="flex flex-col gap-4 bg-background p-5">
                    <div className="flex items-center gap-2">
                        {FILTERS.map((width) => (
                            <span
                                key={width}
                                className={cn('h-7 rounded-full border border-divider bg-background-paper', width)}
                            />
                        ))}
                        <Line className="ml-auto w-16 bg-divider" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {CARDS.map((card, index) => (
                            <m.div
                                key={card.id}
                                initial={reduce ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 + index * 0.06, ease: [0.2, 0, 0, 1] }}
                                className="flex flex-col gap-2 overflow-hidden rounded-md border border-divider bg-background-paper"
                            >
                                <div className={cn('aspect-[4/3] opacity-70', card.photo)} />
                                <div className="flex flex-col gap-1.5 px-3 pb-3">
                                    <Line className="h-2.5 w-2/5 bg-text-primary opacity-80" />
                                    <Line className={cn('bg-text-primary opacity-50', card.title)} />
                                    <div className="flex items-center gap-1.5">
                                        <Line className="w-1/3 bg-divider" />
                                        <span className={cn('ml-auto h-3 w-10 rounded-full', PILL[card.pill])} />
                                    </div>
                                </div>
                            </m.div>
                        ))}
                    </div>
                </div>
            </Paper>
        </m.div>
    );
}
