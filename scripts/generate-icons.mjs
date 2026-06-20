// scripts/generate-icons.mjs
// Generate all favicon/PWA/Apple icons from Portfolio Logo.png

import sharp from "sharp";
import { writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve("Portfolio Logo.png");

const outputs = [
  // Next.js app-router conventions (src/app/*)
  { path: "src/app/icon.png",        size: 512 }, // replaces icon.svg via filename precedence; we'll also remove icon.svg
  { path: "src/app/apple-icon.png",  size: 180 },
  // PWA icons referenced by site.webmanifest
  { path: "public/icon-192.png",     size: 192 },
  { path: "public/icon-512.png",     size: 512 },
  // Static fallback in public for any direct references
  { path: "public/favicon-32.png",   size: 32  },
  { path: "public/favicon-16.png",   size: 16  },
];

for (const { path, size } of outputs) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover" })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(path);
  console.log(`✓ ${path} (${size}×${size})`);
}

// Build a multi-resolution favicon.ico from 16, 32, 48 PNGs.
// sharp doesn't write .ico directly, so we hand-pack the ICO container.
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map((s) =>
    sharp(SRC)
      .resize(s, s, { fit: "cover" })
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer()
  )
);

function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type 1 = icon
  header.writeUInt16LE(count, 4); // count

  const entrySize = 16;
  const entries = Buffer.alloc(entrySize * count);
  let offset = 6 + entrySize * count;
  const imageBlobs = [];

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const size = sizes[i];
    const e = entries.subarray(i * entrySize, (i + 1) * entrySize);
    e.writeUInt8(size === 256 ? 0 : size, 0); // width  (0 means 256)
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2);                       // color palette
    e.writeUInt8(0, 3);                       // reserved
    e.writeUInt16LE(1, 4);                    // color planes
    e.writeUInt16LE(32, 6);                   // bits per pixel
    e.writeUInt32LE(png.length, 8);           // image size
    e.writeUInt32LE(offset, 12);              // offset to image data
    imageBlobs.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, entries, ...imageBlobs]);
}

const icoBuffer = buildIco(icoPngs, icoSizes);
writeFileSync("src/app/favicon.ico", icoBuffer);
console.log(`✓ src/app/favicon.ico (multi-res: ${icoSizes.join(", ")})`);

// Also drop one in /public for any legacy /favicon.ico requests
writeFileSync("public/favicon.ico", icoBuffer);
console.log("✓ public/favicon.ico");

console.log("\nAll icons generated from Portfolio Logo.png");
