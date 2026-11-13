import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { trackScrollEdges } from '@/shared/lib/scrollEdges';

export interface PhotoGalleryProps {
  title: string;
  photos: readonly { id: string; url: string }[];
}

/**
 * On a phone: one photo at a time, full-bleed, swiped sideways (CSS scroll snap, no script but
 * the counter); on wide screens: the chosen photo large and the rest as thumbnails.
 */
export function PhotoGallery({ title, photos }: PhotoGalleryProps) {
  const { t } = useTranslation('listing');
  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState(0);
  const current = photos[Math.min(index, photos.length - 1)];
  const empty = (
    <div className="flex size-full items-center justify-center">
      <Typography variant="body2" color="textSecondary">
        {t('card.noPhoto')}
      </Typography>
    </div>
  );
  return (
    <section aria-label={t('detail.photos', { title })} className="flex flex-col gap-2">
      {/* The phone's carousel: bleeds to the screen's edges (the page's 1 rem gutter), snaps per photo. */}
      <div className="relative -mx-4 md:hidden">
        <ul
          className="app-scroll-quiet m-0 flex snap-x snap-mandatory list-none overflow-x-auto p-0"
          onScroll={(event) => {
            const { scrollLeft, clientWidth } = event.currentTarget;
            setSlide(clientWidth > 0 ? Math.round(scrollLeft / clientWidth) : 0);
          }}
        >
          {photos.length === 0 && (
            <li className="aspect-[4/3] w-full shrink-0 bg-badge-neutral-background">{empty}</li>
          )}
          {photos.map((photo, photoIndex) => (
            <li
              key={photo.id}
              className="aspect-[4/3] w-full shrink-0 snap-center bg-badge-neutral-background"
            >
              <img
                src={photo.url}
                alt={t('detail.photo', { number: photoIndex + 1, count: photos.length })}
                loading={photoIndex === 0 ? 'eager' : 'lazy'}
                decoding="async"
                width={1200}
                height={900}
                className="size-full object-cover"
              />
            </li>
          ))}
        </ul>
        {photos.length > 1 && (
          <>
            <Typography
              variant="caption"
              component="p"
              role="status"
              className="app-tabular absolute top-3 right-7 m-0 rounded-full bg-footer-background/70 px-2.5 py-1 text-footer-text backdrop-blur-sm"
            >
              {t('detail.photoCounter', { number: slide + 1, count: photos.length })}
            </Typography>
            <ul
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-3 m-0 flex list-none justify-center gap-1.5 p-0"
            >
              {photos.map((photo, photoIndex) => (
                <li
                  key={photo.id}
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    photoIndex === slide ? 'bg-background-paper' : 'bg-background-paper/50',
                  )}
                />
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="hidden aspect-[3/2] w-full overflow-hidden rounded-lg bg-badge-neutral-background md:block">
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
          empty
        )}
      </div>
      {photos.length > 1 && (
        <ul
          ref={trackScrollEdges}
          className="app-scroll-fade app-scroll-quiet m-0 hidden list-none gap-2 overflow-x-auto p-0 pb-1 md:flex"
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
