import { pick } from './seed-random';

/**
 * Photos: a fixed pool of Unsplash images (served by Unsplash's CDN, Unsplash licence) of homes
 * and rooms, until the uploads module (M1) stores real photos in R2 — a project decision.
 * Exteriors come first on a house's gallery; every listing gets rooms from the interior pool.
 */
const UNSPLASH = (id: string): string =>
    `https://images.unsplash.com/photo-${id}?w=1200&h=800&q=70&auto=format&fit=crop`;
const EXTERIOR_PHOTOS = [
    '1512917774080-9991f1c4c750',
    '1568605114967-8130f3a36994',
    '1570129477492-45c003edd2be',
    '1600596542815-ffad4c1539a9',
    '1600585154340-be6161a56a0c',
    '1600566753190-17f0baa2a6c3',
    '1564013799919-ab600027ffc6',
    '1580587771525-78b9dba3b914',
    '1583608205776-bfd35f0d9f83',
    '1523217582562-09d0def993a6',
    '1449844908441-8829872d2607',
].map(UNSPLASH);
const INTERIOR_PHOTOS = [
    '1502672260266-1c1ef2d93688',
    '1522708323590-d24dbb6b0267',
    '1493809842364-78817add7ffb',
    '1484154218962-a197022b5858',
    '1556228453-efd6c1ff04f6',
    '1560448204-e02f11c3d0e2',
    '1502005229762-cf1b2da7c5d6',
    '1600607687939-ce8a6c25118c',
    '1586023492125-27b2c045efd7',
    '1554995207-c18c203602cb',
    '1565182999561-18d7dc61c393',
    '1556911220-bff31c812dba',
    '1540518614846-7eded433c457',
    '1505693416388-ac5ce068fe85',
    '1616594039964-ae9021a400a0',
    '1552321554-5fefe8c9ef14',
    '1507652313519-d4e9174996dd',
    '1484101403633-562f891dc89a',
    '1598928506311-c55ded91a20c',
    '1536376072261-38c75010e6c9',
    '1588854337115-1c67d9247e4d',
    '1595526114035-0d45ed16cfbf',
    '1524758631624-e2822e304c36',
    '1513694203232-719a280e022f',
    '1567767292278-a4f21aa2d36e',
].map(UNSPLASH);
export const RETIRED_PHOTO_HOST = 'https://loremflickr.com/';

/** Consecutive rooms differ: the interior pool is walked from a per-listing offset. */
export const photoUrl = (listingIndex: number, photoIndex: number, isHouse: boolean): string => {
    if (isHouse && photoIndex === 0) {
        return pick(EXTERIOR_PHOTOS, ((listingIndex * 7) % 97) / 97);
    }
    const offset = (listingIndex * 11) % INTERIOR_PHOTOS.length;
    return pick(INTERIOR_PHOTOS, ((offset + photoIndex * 3) % INTERIOR_PHOTOS.length) / INTERIOR_PHOTOS.length);
};

/** MIG-7: fixed ids, so a re-run skips photos that exist. */
export const photoId = (listingIndex: number, photoIndex: number): string =>
    `019a0000-0000-7000-8001-${String(listingIndex + 1).padStart(8, '0')}${String(photoIndex).padStart(4, '0')}`;
