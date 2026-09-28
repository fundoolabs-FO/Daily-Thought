// Generates PWA icons into public/icons from an inline SVG.
// Run with: npm run icons
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = new URL("../public/icons/", import.meta.url);

// A glowing lightbulb: a new idea each day.
// The bulb is drawn on a 100-unit grid, then scaled to fit the icon.
// `inset` shrinks the artwork so maskable icons keep it inside the 80% safe zone.
function art({ size, rounded, inset = 1 }) {
  const r = rounded ? size * 0.22 : 0;
  const s = size * inset;
  const o = (size - s) / 2;
  const k = s / 100;
  const rays = [-150, -115, -90, -65, -30, 180, 0]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const [x1, y1] = [50 + 27 * Math.cos(a), 40 + 27 * Math.sin(a)];
      const [x2, y2] = [50 + 34 * Math.cos(a), 40 + 34 * Math.sin(a)];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    })
    .join("");
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2240"/>
      <stop offset="1" stop-color="#2d3a5c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.44" r="0.5">
      <stop offset="0" stop-color="#e3a44f" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#e3a44f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd48a"/>
      <stop offset="1" stop-color="#f2b766"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#sky)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#glow)"/>
  <g transform="translate(${o} ${o + 3 * k}) scale(${k})">
    <g stroke="#f2b766" stroke-width="3.2" stroke-linecap="round" opacity="0.9">${rays}</g>
    <path d="M41 65 C41 57 30 53 30 40 A20 20 0 1 1 70 40 C70 53 59 57 59 65 Z" fill="url(#glass)"/>
    <path d="M37.5 38 A13 13 0 0 1 47 27.5" fill="none" stroke="#fff6e3" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
    <path d="M46 64 V54 A4 4 0 0 1 54 54 V64" fill="none" stroke="#c98a3e" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    <rect x="40" y="68" width="20" height="5" rx="2.5" fill="#f7f3ec"/>
    <rect x="41.5" y="75" width="17" height="5" rx="2.5" fill="#f7f3ec" opacity="0.8"/>
    <rect x="45" y="82" width="10" height="3.5" rx="1.75" fill="#f7f3ec" opacity="0.6"/>
  </g>
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
