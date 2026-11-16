// npm run icons – draws the app icons (Točka's face) as PNG files, no image libraries needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
type Shape = { color: RGB; inside: (x: number, y: number) => boolean };

const SEA: RGB = [14, 143, 154];
const WHITE: RGB = [255, 255, 255];
const DARK: RGB = [27, 42, 48];
const MUZZLE: RGB = [243, 239, 230];
const SUN: RGB = [245, 183, 42];
const CORAL: RGB = [239, 106, 91];

const ellipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** Face in a 0..1 box; `scale` shrinks it towards the centre (maskable safe zone). */
function shapes(scale: number): Shape[] {
  const t = (v: number) => 0.5 + (v - 0.5) * scale;
  const s = (v: number) => v * scale;
  const E = (cx: number, cy: number, rx: number, ry: number) => ellipse(t(cx), t(cy), s(rx), s(ry));
  const C = (cx: number, cy: number, r: number) => circle(t(cx), t(cy), s(r));
  return [
    { color: DARK, inside: E(0.2, 0.5, 0.11, 0.22) }, // ears
    { color: DARK, inside: E(0.8, 0.5, 0.11, 0.22) },
    { color: DARK, inside: E(0.5, 0.52, 0.33, 0.31) }, // outline
    { color: WHITE, inside: E(0.5, 0.52, 0.31, 0.29) }, // head
    { color: DARK, inside: C(0.33, 0.35, 0.045) }, // spots
    { color: DARK, inside: C(0.68, 0.32, 0.03) },
    { color: DARK, inside: C(0.74, 0.6, 0.035) },
    { color: DARK, inside: C(0.5, 0.29, 0.022) },
    { color: CORAL, inside: C(0.32, 0.6, 0.045) }, // cheeks
    { color: CORAL, inside: C(0.68, 0.6, 0.045) },
    { color: DARK, inside: E(0.41, 0.48, 0.045, 0.055) }, // eyes
    { color: DARK, inside: E(0.59, 0.48, 0.045, 0.055) },
    { color: WHITE, inside: C(0.425, 0.465, 0.015) },
    { color: WHITE, inside: C(0.605, 0.465, 0.015) },
    { color: MUZZLE, inside: E(0.5, 0.64, 0.12, 0.085) },
    { color: DARK, inside: E(0.5, 0.6, 0.055, 0.04) }, // nose
    { color: SUN, inside: C(0.5, 0.85, 0.04) }, // tag
  ];
}

function render(size: number, scale: number): Buffer {
  const list = shapes(scale);
  const SS = 4;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / size;
          const py = (y + (sy + 0.5) / SS) / size;
          let c: RGB = SEA;
          for (const sh of list) if (sh.inside(px, py)) c = sh.color;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round(r / SS / SS);
      raw[o + 1] = Math.round(g / SS / SS);
      raw[o + 2] = Math.round(b / SS / SS);
    }
  }
  return png(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w: number, h: number, raw: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB, no alpha (iOS wants no transparency)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = join(import.meta.dirname, '..', 'public', 'icons');
mkdirSync(out, { recursive: true });
const files: [string, number, number][] = [
  ['apple-touch-icon.png', 180, 0.95],
  ['icon-192.png', 192, 0.95],
  ['icon-512.png', 512, 0.95],
  ['icon-maskable-512.png', 512, 0.72],
];
for (const [name, size, scale] of files) {
  writeFileSync(join(out, name), render(size, scale));
  console.log('✓', name);
}
