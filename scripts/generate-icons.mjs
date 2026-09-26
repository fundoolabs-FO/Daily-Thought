// Generates PWA icons into public/icons from an inline SVG.
// Run with: npm run icons
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = new URL("../public/icons/", import.meta.url);

// A sun rising over a horizon: a new thought each morning.
// `inset` shrinks the artwork so maskable icons keep it inside the 80% safe zone.
function art({ size, rounded, inset = 1 }) {
  const r = rounded ? size * 0.22 : 0;
  const s = size * inset;
  const o = (size - s) / 2;
  const cx = size / 2;
  const horizon = o + s * 0.66;
  const sunR = s * 0.2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2240"/>
      <stop offset="1" stop-color="#2d3a5c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="${horizon / size}" r="0.55">
      <stop offset="0" stop-color="#e3a44f" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#e3a44f" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="above"><rect x="0" y="0" width="${size}" height="${horizon}"/></clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#sky)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#glow)"/>
  <circle cx="${cx}" cy="${horizon}" r="${sunR}" fill="#f2b766" clip-path="url(#above)"/>
  <rect x="${o + s * 0.2}" y="${horizon - s * 0.012}" width="${s * 0.6}" height="${s * 0.024}" rx="${s * 0.012}" fill="#f7f3ec"/>
  <rect x="${o + s * 0.32}" y="${horizon + s * 0.07}" width="${s * 0.36}" height="${s * 0.02}" rx="${s * 0.01}" fill="#f7f3ec" opacity="0.55"/>
</svg>`;
}

const icons = [
  { file: "icon-192.png", size: 192, rounded: true },
  { file: "icon-512.png", size: 512, rounded: true },
  { file: "icon-maskable-512.png", size: 512, rounded: false, inset: 0.8 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, inset: 0.9 },
];

await mkdir(OUT, { recursive: true });
for (const icon of icons) {
  await sharp(Buffer.from(art(icon))).png().toFile(fileURLToPath(new URL(icon.file, OUT)));
  console.log("wrote", icon.file);
}

// Browser tab icon, picked up by Next's `app/icon.png` convention.
await sharp(Buffer.from(art({ size: 64, rounded: true })))
  .png()
  .toFile(fileURLToPath(new URL("../src/app/icon.png", import.meta.url)));
console.log("wrote src/app/icon.png");
