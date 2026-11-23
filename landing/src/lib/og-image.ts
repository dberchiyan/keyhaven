import sharp from 'sharp';

import type { PageMeta } from '@/content/pages';
import type { ShareCard } from '@/content/showcase';
import { SITE } from '@/content/site';

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const HEADING_LINE_CHARACTERS = 22;
const HEADING_MAX_LINES = 3;
const HEADING_LINE_HEIGHT = 70;
const LEAD_LINE_CHARACTERS = 50;
const LEAD_MAX_LINES = 3;
const LEAD_LINE_HEIGHT = 34;
const CARD_TITLE_CHARACTERS = 30;
const TEXT_LEFT = 80;
const HEADING_TOP = 280;
const LEAD_TOP = 272;

const escapeXml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap by character count: the build machine's font metrics are unknown, so lines are kept short. */
const wrap = (text: string, width: number, maxLines: number): string[] => {
    const lines: string[] = [];
    for (const word of text.split(/\s+/)) {
        const last = lines.at(-1);
        if (last !== undefined && `${last} ${word}`.length <= width) {
            lines[lines.length - 1] = `${last} ${word}`;
            continue;
        }
        lines.push(word);
    }
    if (lines.length <= maxLines) {
        return lines;
    }
    return [
        ...lines.slice(0, maxLines - 1),
        `${lines
            .slice(maxLines - 1)
            .join(' ')
            .slice(0, width - 1)}…`,
    ];
};

const truncate = (text: string, width: number): string =>
    text.length <= width ? text : `${text.slice(0, width - 1)}…`;

const textLines = (lines: string[], x: number, y: number, step: number, attributes: string): string =>
    lines
        .map((line, index) => `<text x="${x}" y="${y + index * step}" ${attributes}>${escapeXml(line)}</text>`)
        .join('');

/** The drawn search card: a real home of the snapshot (LD-7), its photo replaced by the brand's gradient. */
const homeCard = (home: ShareCard): string => `
  <g transform="translate(790 110)">
    <rect width="330" height="410" rx="26" fill="#f7f2ea"/>
    <rect x="16" y="16" width="298" height="200" rx="18" fill="url(#photo)"/>
    <text x="28" y="264" font-family="${FONT}" font-size="30" font-weight="700" fill="#243a31">${escapeXml(home.price)}</text>
    <text x="28" y="300" font-family="${FONT}" font-size="19" font-weight="600" fill="#2b3f36">${escapeXml(truncate(home.title, CARD_TITLE_CHARACTERS))}</text>
    <text x="28" y="330" font-family="${FONT}" font-size="17" fill="#5e6f67">${escapeXml(home.facts)}</text>
    <text x="28" y="356" font-family="${FONT}" font-size="17" fill="#5e6f67">${escapeXml(truncate(home.place, CARD_TITLE_CHARACTERS))}</text>
    <rect x="28" y="372" width="150" height="26" rx="13" fill="#dfeee6"/>
    <text x="103" y="390" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="#2f5a47">${escapeXml(home.pill)}</text>
  </g>`;

/** A page's 1200 × 630 share image (LD-39), drawn as SVG and rendered to PNG by sharp at build: networks reject SVG. */
export const renderShareImage = async (page: PageMeta): Promise<Buffer> => {
    const heading = wrap(page.shareHeading, HEADING_LINE_CHARACTERS, HEADING_MAX_LINES);
    const lead = wrap(page.description, LEAD_LINE_CHARACTERS, LEAD_MAX_LINES);
    const leadTop = LEAD_TOP + heading.length * HEADING_LINE_HEIGHT;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" viewBox="0 0 ${SHARE_WIDTH} ${SHARE_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d3a2f"/><stop offset="1" stop-color="#101d18"/></linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0" r="0.8"><stop offset="0" stop-color="#7fc9a8" stop-opacity="0.35"/><stop offset="1" stop-color="#7fc9a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="photo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3b25a"/><stop offset="0.6" stop-color="#2f6b55"/><stop offset="1" stop-color="#17352a"/></linearGradient>
  </defs>
  <rect width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" fill="url(#bg)"/>
  <rect width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" fill="url(#glow)"/>
  <g transform="translate(80 80)">
    <rect width="72" height="72" rx="18" fill="#2f6b55"/>
    <path transform="translate(12 12)" d="M24 9 9 22h4v14h9V26h4v10h9V22h4z" fill="#f7f2ea"/>
    <circle cx="36" cy="32" r="3.6" fill="#2f6b55"/>
    <text x="92" y="52" font-family="${FONT}" font-size="40" font-weight="700" fill="#f7f2ea">${escapeXml(SITE.name)}</text>
  </g>
  <text x="80" y="215" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="2" fill="#b8e4cf">${escapeXml(page.shareEyebrow.toUpperCase())}</text>
  ${textLines(heading, TEXT_LEFT, HEADING_TOP, HEADING_LINE_HEIGHT, `font-family="${FONT}" font-size="58" font-weight="700" fill="#f7f2ea" letter-spacing="-1.5"`)}
  ${textLines(lead, TEXT_LEFT, leadTop, LEAD_LINE_HEIGHT, `font-family="${FONT}" font-size="22" fill="#cfdad3"`)}
  ${page.shareCard ? homeCard(page.shareCard) : ''}
</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
};
