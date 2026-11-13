import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';

export interface PhotoGalleryProps {
  title: string;
  photos: readonly { id: string; url: string }[];
}

/** The chosen photo large, the rest as thumbnails in a row that scrolls sideways on phones. */
export function PhotoGallery({ title, photos }: PhotoGalleryProps) {
  const { t } = useTranslation('listing');
  const [index, setIndex] = useState(0);
  const current = photos[Math.min(index, photos.length - 1)];
  return (
    <section aria-label={t('detail.photos', { title })} className="flex flex-col gap-2">
      <div className="aspect-[3/2] w-full overflow-hidden rounded-lg bg-badge-neutral-background">
        {current ? (
          <img
            src={current.url}
            alt={t('detail.photo', { number: index + 1, count: photos.length })}
            decoding="async"
            width={1200}
            height={800}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Typography variant="body2" color="textSecondary">
              {t('card.noPhoto')}
            </Typography>
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <ul
          ref={trackScrollEdges}
          className="app-scroll-fade m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1"
        >
          {photos.map((photo, photoIndex) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                aria-label={t('detail.showPhoto', { number: photoIndex + 1 })}
                aria-pressed={photoIndex === index}
                onClick={() => {
                  setIndex(photoIndex);
                }}
                className={cn(
                  'block size-20 cursor-pointer overflow-hidden rounded-md border-2 bg-badge-neutral-background p-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary',
                  photoIndex === index ? 'border-primary' : 'border-transparent',
                )}
              >
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={160}
                  height={160}
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
