// Preview which rows/cols fall inside the accent zones for a 100x55 sample
const sharp = require("sharp");
const COLS = 100, ROWS = 55;
const RAMP = " .·:;+=*x#%@";

function accent(c, r) {
  const x = c / (COLS - 1), y = r / (ROWS - 1);
  const h = (Math.sin(c * 12.9898 + r * 78.233 + 43.1) * 43758.5453) % 1;
  const H = h < 0 ? h + 1 : h;
  if (y >= 0.32 && y <= 0.44 && x >= 0.14 && x <= 0.86 && H < 0.6) return "Y";
  if (y >= 0.53 && y <= 0.62 && x >= 0.28 && x <= 0.72 && H < 0.5) return "M";
  if (H > 0.988) return "G";
  return null;
}

(async () => {
  const { data } = await sharp("profile.jpg").grayscale().resize(COLS, ROWS, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  for (let r = 0; r < ROWS; r++) {
    let line = String(r).padStart(2, "0") + " ";
    for (let c = 0; c < COLS; c++) {
      const l = data[r * COLS + c];
      const ch = RAMP[Math.round(l / 255 * (RAMP.length - 1))];
      const a = accent(c, r);
      if (a === "Y") line += "\x1b[33m" + (ch === " " ? "·" : ch) + "\x1b[0m";
      else if (a === "M") line += "\x1b[35m" + (ch === " " ? "·" : ch) + "\x1b[0m";
      else if (a === "G") line += "\x1b[32m" + (ch === " " ? "·" : ch) + "\x1b[0m";
      else line += ch;
    }
    console.log(line);
  }
})();
