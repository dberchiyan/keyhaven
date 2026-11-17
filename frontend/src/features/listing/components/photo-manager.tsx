import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { TFunction } from 'i18next';
import { type ReactElement, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useRemovePhoto, useReorderPhotos } from '../hooks/use-listing-mutations';
import { PHOTO_TYPES, type PhotoUploadError, usePhotoUpload } from '../hooks/use-photo-upload';
import type { ManagedListing } from '../types';
import { PhotoTile } from './photo-tile';

const MAX_PHOTOS = 20;

const photoErrorText = (
    error: PhotoUploadError | undefined,
    t: TFunction<['listing', 'errors']>,
): string | undefined => {
    if (error === undefined) {
        return undefined;
    }
    if (error === 'PHOTO_TYPE') {
        return t('listing:photos.typeRejected');
    }
    if (error === 'PHOTO_SIZE') {
        return t('listing:photos.tooLarge');
    }
    return t(`errors:${error}`);
};

export interface PhotoManagerProps {
    listing: ManagedListing;
    readOnly?: boolean;
}

/**
 * Upload (straight to storage), reorder and remove, up to the backend's limit of ready photos
 * (listing/service/photo-status.ts). On a showcase listing of the demo every control is shown
 * disabled; the page says why.
 */
export function PhotoManager({ listing, readOnly = false }: PhotoManagerProps): ReactElement {
    const { t } = useTranslation(['listing', 'errors']);
    const { upload, progress, error, clearError } = usePhotoUpload(listing.id);
    const reorder = useReorderPhotos(listing.id);
    const remove = useRemovePhoto(listing.id);
    const inputRef = useRef<HTMLInputElement>(null);
    const headingId = useId();
    const ready = listing.managedPhotos
        .filter((photo) => photo.status === 'READY')
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const isBusy = readOnly || progress !== undefined || reorder.isPending || remove.isPending;

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

    const errorText = photoErrorText(error ?? reorder.error?.code ?? remove.error?.code, t);

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
                        <PhotoTile
                            key={photo.id}
                            photo={photo}
                            index={index}
                            count={ready.length}
                            isBusy={isBusy}
                            onMove={(direction) => {
                                move(index, direction);
                            }}
                            onRemove={() => {
                                remove.mutate(photo.id);
                            }}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
