import sharp from 'sharp';
import toIco from 'to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svgPath = join(root, 'src/app/icon.svg');
const svg = readFileSync(svgPath);

async function generate() {
  const sizes = [
    { size: 16, output: null },
    { size: 32, output: null },
    { size: 180, output: 'src/app/apple-icon.png' },
    { size: 192, output: 'public/icon-192.png' },
    { size: 512, output: 'public/icon-512.png' },
  ];

  const pngBuffers = {};

  for (const { size, output } of sizes) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    pngBuffers[size] = buf;
    if (output) {
      writeFileSync(join(root, output), buf);
      console.log(`Created ${output} (${size}x${size})`);
    }
  }

  const ico = await toIco([pngBuffers[16], pngBuffers[32]]);
  writeFileSync(join(root, 'src/app/favicon.ico'), ico);
  console.log('Created src/app/favicon.ico (16x16 + 32x32)');
}

generate().catch(console.error);
