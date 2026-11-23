import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { Link as RouterLink } from 'react-router';

export interface BackLink {
    to: string;
    label: string;
}

export interface DetailPageFrameProps {
    headingRef: RefObject<HTMLHeadingElement | null>;
    title: string;
    back: BackLink;
    meta?: ReactNode;
    children: ReactNode;
}

/**
 * A back link, the page heading (focused on arrival, A11Y-3) with an optional line of facts under it, and the
 * content — shared by the listing pages.
 */
export function DetailPageFrame({ headingRef, title, back, meta, children }: DetailPageFrameProps): ReactElement {
    return (
        <div className="flex flex-col gap-4">
            <Button
                component={RouterLink}
                to={back.to}
                variant="text"
                size="small"
                startIcon={<ArrowBackOutlined aria-hidden />}
                className="self-start"
            >
                {back.label}
            </Button>
            <div className="flex flex-col gap-2">
                <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                    {title}
                </Typography>
                {meta}
            </div>
            {children}
        </div>
    );
}
