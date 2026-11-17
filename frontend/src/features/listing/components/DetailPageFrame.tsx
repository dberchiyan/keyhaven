import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactNode, RefObject } from 'react';
import { Link as RouterLink } from 'react-router';

export interface DetailPageFrameProps {
    headingRef: RefObject<HTMLHeadingElement | null>;
    title: string;
    back: { to: string; label: string };
    children: ReactNode;
}

/** A back link, the page heading and the content below — shared by both listing pages. */
export function DetailPageFrame({ headingRef, title, back, children }: DetailPageFrameProps) {
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
