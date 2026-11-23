import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { ManagedPhoto } from '../types';

export interface PhotoTileProps {
    photo: ManagedPhoto;
    index: number;
    count: number;
    isBusy: boolean;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
}

/**
 * One ready photo with its controls: arrow buttons rather than drag and drop, so reordering works
 * from the keyboard (A11Y-2); the first photo is the cover.
 */
export function PhotoTile({ photo, index, count, isBusy, onMove, onRemove }: PhotoTileProps): ReactElement {
    const { t } = useTranslation('listing');
    const number = index + 1;
    return (
        <li className="flex flex-col gap-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-md bg-badge-neutral-background">
                {photo.url && (
                    <img
                        src={photo.url}
                        alt={t('photos.photo', { number })}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                    />
                )}
                {index === 0 && (
                    <Typography
                        variant="caption"
                        component="span"
                        className="absolute top-1 left-1 rounded-full bg-background-paper/90 px-2 py-0.5"
                    >
                        {t('photos.cover')}
                    </Typography>
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="flex">
                    <IconButton
                        size="small"
                        aria-label={t('photos.moveLeft', { number })}
                        disabled={isBusy || index === 0}
                        onClick={() => {
                            onMove(-1);
                        }}
                    >
                        <ArrowBackOutlined aria-hidden fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label={t('photos.moveRight', { number })}
                        disabled={isBusy || index === count - 1}
                        onClick={() => {
                            onMove(1);
                        }}
                    >
                        <ArrowForwardOutlined aria-hidden fontSize="small" />
                    </IconButton>
                </div>
                <IconButton
                    size="small"
                    aria-label={t('photos.remove', { number })}
                    disabled={isBusy}
                    onClick={onRemove}
                >
                    <DeleteOutlined aria-hidden fontSize="small" />
                </IconButton>
            </div>
        </li>
    );
}
