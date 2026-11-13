import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { SITE } from '@/content/site';

/**
 * The 1200 × 630 share image, drawn as SVG and rendered to PNG at build time (social networks
 * do not accept SVG): the Keyhaven name on deep forest, with a drawn listing card beside it.
 * Text uses the build machine's sans-serif.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d3a2f"/>
      <stop offset="1" stop-color="#101d18"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0" r="0.8">
      <stop offset="0" stop-color="#7fc9a8" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#7fc9a8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="photo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e3b25a"/>
      <stop offset="0.6" stop-color="#2f6b55"/>
      <stop offset="1" stop-color="#17352a"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <g transform="translate(80 92)">
    <rect width="72" height="72" rx="18" fill="#2f6b55"/>
    <path transform="translate(12 12) scale(1)" d="M24 9 9 22h4v14h9V26h4v10h9V22h4z" fill="#f7f2ea"/>
    <circle cx="36" cy="32" r="3.6" fill="#2f6b55"/>
    <text x="92" y="52" font-family="${FONT}" font-size="40" font-weight="700" fill="#f7f2ea">${SITE.name}</text>
  </g>
  <text x="80" y="268" font-family="${FONT}" font-size="60" font-weight="700" fill="#f7f2ea" letter-spacing="-1.5">Find a home you can</text>
  <text x="80" y="340" font-family="${FONT}" font-size="60" font-weight="700" fill="#b8e4cf" letter-spacing="-1.5">picture living in.</text>
  <text x="80" y="404" font-family="${FONT}" font-size="24" fill="#cfdad3">Rent or buy · Austin, Denver, Seattle,</text>
  <text x="80" y="438" font-family="${FONT}" font-size="24" fill="#cfdad3">Chicago, Atlanta and Phoenix</text>
  <text x="80" y="486" font-family="${FONT}" font-size="22" fill="#9fb3a8">Browse without an account · a public demo with fictional data</text>

  <g transform="translate(790 110)">
    <rect width="330" height="410" rx="26" fill="#f7f2ea"/>
    <rect x="16" y="16" width="298" height="200" rx="18" fill="url(#photo)"/>
    <rect x="100" y="110" width="130" height="106" fill="#f7f2ea" fill-opacity="0.25"/>
    <rect x="124" y="60" width="26" height="26" rx="4" fill="#f7f2ea" fill-opacity="0.55"/>
    <rect x="180" y="60" width="26" height="26" rx="4" fill="#f7f2ea" fill-opacity="0.55"/>
    <circle cx="276" cy="52" r="20" fill="#f7f2ea"/>
    <path transform="translate(266 42) scale(0.85)" d="M12 20.5 4.9 13.6A4.6 4.6 0 0 1 11.4 7l.6.6.6-.6a4.6 4.6 0 0 1 6.5 6.6L12 20.5Z" fill="#b9402f"/>
    <text x="28" y="264" font-family="${FONT}" font-size="30" font-weight="700" fill="#243a31">$2,450/mo</text>
    <text x="28" y="300" font-family="${FONT}" font-size="19" font-weight="600" fill="#2b3f36">Sunny 2-bedroom in Capitol Hill</text>
    <text x="28" y="330" font-family="${FONT}" font-size="17" fill="#5e6f67">2 beds · 1.5 baths · 940 sq ft</text>
    <text x="28" y="356" font-family="${FONT}" font-size="17" fill="#5e6f67">Capitol Hill · Seattle, WA</text>
    <rect x="28" y="372" width="150" height="26" rx="13" fill="#dfeee6"/>
    <text x="103" y="390" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="#2f5a47">Available Dec 1</text>
  </g>
</svg>`;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
