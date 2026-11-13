import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import { type ReactNode, useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface FilterPillProps {
  /** The pill's name when nothing is chosen; the chosen value replaces it. */
  label: string;
  value?: string;
  /** The popover's content; `close` applies and dismisses. */
  children: (close: () => void) => ReactNode;
  /** Opens something else (the drawer) instead of a popover. */
  onClick?: () => void;
  badge?: number;
}

/**
 * One filter of the toolbar as a pill: outlined when idle, filled when it carries a value; opens
 * a small popover with its control (or, with `onClick`, whatever the caller opens).
 */
export function FilterPill({ label, value, children, onClick, badge }: FilterPillProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  const active = value !== undefined || (badge !== undefined && badge > 0);
  const text = value ?? (badge ? `${label} · ${badge}` : label);
  const close = (): void => {
    setAnchor(null);
  };
  return (
    <>
      <Button
        variant={active ? 'contained' : 'outlined'}
        size="small"
        endIcon={onClick ? undefined : <ExpandMoreOutlined aria-hidden />}
        aria-haspopup={onClick ? 'dialog' : 'true'}
        aria-expanded={anchor !== null}
        aria-controls={anchor ? id : undefined}
        aria-label={value === undefined ? undefined : `${label}: ${value}`}
        onClick={(event) => {
          if (onClick) {
            onClick();
            return;
          }
          setAnchor(event.currentTarget);
        }}
        className={cn('shrink-0 whitespace-nowrap', !active && 'bg-background-paper')}
      >
        {text}
      </Button>
      {!onClick && (
        <Popover
          id={id}
          open={anchor !== null}
          anchorEl={anchor}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { className: 'mt-1 min-w-56 max-w-[calc(100vw-2rem)] p-2' } }}
        >
          {children(close)}
        </Popover>
      )}
    </>
  );
}
