import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PHOTO_TYPES, usePhotoUpload } from '../hooks/usePhotoUpload';
import { useRemovePhoto, useReorderPhotos } from '../hooks/useListingQueries';
import type { ManagedListing } from '../types';

/** The backend keeps at most this many ready photos (listing/service/photo-status.ts). */
const MAX_PHOTOS = 20;

export interface PhotoManagerProps {
    listing: ManagedListing;
    /** A showcase listing of the demo: every control is shown disabled (the page says why). */
    readOnly?: boolean;
}

/** Upload (straight to storage), reorder with arrow buttons (keyboard-friendly), remove. */
export function PhotoManager({ listing, readOnly = false }: PhotoManagerProps) {
    const { t } = useTranslation(['listing', 'errors']);
    const { upload, progress, error, clearError } = usePhotoUpload(listing.id);
    const reorder = useReorderPhotos(listing.id);
    const remove = useRemovePhoto(listing.id);
    const inputRef = useRef<HTMLInputElement>(null);
    const headingId = useId();
    const ready = listing.managedPhotos
        .filter((photo) => photo.status === 'READY')
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const isBusy = readOnly || progress !== null || reorder.isPending || remove.isPending;

    const move = (index: number, direction: -1 | 1): void => {
        const order = ready.map((photo) => photo.id);
        const target = index + direction;
        const [moved] = order.splice(index, 1);
        if (moved === undefined) {
            return;
        }
        order.splice(target, 0, moved);
        reorder.mutate(order);
    };

    const errorText = error
        ? error === 'PHOTO_TYPE'
            ? t('listing:photos.typeRejected')
            : error === 'PHOTO_SIZE'
              ? t('listing:photos.tooLarge')
              : t(`errors:${error}`)
        : reorder.error
          ? t(`errors:${reorder.error.code}`)
          : remove.error
            ? t(`errors:${remove.error.code}`)
            : null;

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Typography id={headingId} variant="h6" component="h2">
                    {t('listing:photos.title', { count: ready.length, max: MAX_PHOTOS })}
                </Typography>
                <input
                    ref={inputRef}
                    type="file"
                    accept={PHOTO_TYPES.join(',')}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) {
                            void upload(file);
                        }
                    }}
                />
                <Button
                    variant="outlined"
                    startIcon={<AddPhotoAlternateOutlined aria-hidden />}
                    disabled={isBusy || ready.length >= MAX_PHOTOS}
                    onClick={() => inputRef.current?.click()}
                >
                    {t('listing:photos.add')}
                </Button>
            </div>
            <Typography variant="body2" color="textSecondary">
                {t('listing:photos.hint')}
            </Typography>
            {progress && (
                <div role="status" aria-live="polite" className="flex flex-col gap-1">
                    <Typography variant="caption">
                        {t('listing:photos.uploading', { name: progress.fileName, percent: progress.percent })}
                    </Typography>
                    <LinearProgress variant="determinate" value={progress.percent} aria-hidden />
                </div>
            )}
            {errorText && (
                <Alert severity="error" role="alert" onClose={clearError}>
                    {errorText}
                </Alert>
            )}
            {ready.length === 0 ? (
                <Typography variant="body2" color="textSecondary" className="py-4">
                    {t('listing:photos.empty')}
                </Typography>
            ) : (
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
                    {ready.map((photo, index) => (
                        <li key={photo.id} className="flex flex-col gap-1">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-badge-neutral-background">
                                {photo.url && (
                                    <img
                                        src={photo.url}
                                        alt={t('listing:photos.photo', { number: index + 1 })}
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
                                        {t('listing:photos.cover')}
                                    </Typography>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex">
                                    <IconButton
                                        size="small"
                                        aria-label={t('listing:photos.moveLeft', { number: index + 1 })}
                                        disabled={isBusy || index === 0}
                                        onClick={() => {
                                            move(index, -1);
                                        }}
                                    >
                                        <ArrowBackOutlined aria-hidden fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        aria-label={t('listing:photos.moveRight', { number: index + 1 })}
                                        disabled={isBusy || index === ready.length - 1}
                                        onClick={() => {
                                            move(index, 1);
                                        }}
                                    >
                                        <ArrowForwardOutlined aria-hidden fontSize="small" />
                                    </IconButton>
                                </div>
                                <IconButton
                                    size="small"
                                    aria-label={t('listing:photos.remove', { number: index + 1 })}
                                    disabled={isBusy}
                                    onClick={() => {
                                        remove.mutate(photo.id);
                                    }}
                                >
                                    <DeleteOutlined aria-hidden fontSize="small" />
                                </IconButton>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
