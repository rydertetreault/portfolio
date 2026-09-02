// Normalized preview — stretch contrast so the dark face is readable
import sharp from "sharp";

const FRAME = process.argv[2] || ".face-frames/f07.jpg";
const COLS = 110, ROWS = 60;
const RAMP = " .·:;+=*x#%@";

// Auto-crop the bottom UI so we see just the face — top 78%
const meta = await sharp(FRAME).metadata();
const cropH = Math.round(meta.height * 0.78);

const buf = await sharp(FRAME)
  .extract({ left: 0, top: 0, width: meta.width, height: cropH })
  .normalize()          // stretch to 0..255
  .linear(1.4, -20)     // extra contrast boost
  .grayscale()
  .resize(COLS, ROWS, { fit: "fill" })
  .raw()
  .toBuffer();

console.log(`─── ${FRAME}  (normalized, cropped to face) ───`);
for (let r = 0; r < ROWS; r++) {
  let row = "";
  for (let c = 0; c < COLS; c++) {
    const y = buf[r * COLS + c];
    row += RAMP[Math.round(y / 255 * (RAMP.length - 1))];
  }
  console.log(row);
}
