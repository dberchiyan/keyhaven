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
    children: ReactNode;
}

/** A back link, the page heading (focused on arrival, A11Y-3) and the content — shared by the listing pages. */
export function DetailPageFrame({ headingRef, title, back, children }: DetailPageFrameProps): ReactElement {
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
            <Typography ref={headingRef} tabIndex={-1} variant="h4" component="h1" className="outline-none">
                {title}
            </Typography>
            {children}
        </div>
    );
}
