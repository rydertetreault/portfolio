// Deep-analyze one frame of face.mp4 — luma preview + exact accent hex values + positions
import sharp from "sharp";

const FRAME = ".face-frames/f07.jpg";
const COLS = 100, ROWS = 55;
const RAMP = " .·:;+=*x#%@";

const { data } = await sharp(FRAME).resize(COLS, ROWS, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });

function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0;if(d>0){if(M===r)h=((g-b)/d)%6;else if(M===g)h=(b-r)/d+2;else h=(r-g)/d+4;}h=(h*60+360)%360;return[h,M===0?0:d/M,M];}

// ASCII luma preview
console.log("─── luma preview (bright=dense) ───");
for (let r = 0; r < ROWS; r++) {
  let row = "";
  for (let c = 0; c < COLS; c++) {
    const i = (r * COLS + c) * 3;
    const R=data[i], G=data[i+1], B=data[i+2];
    const y = 0.299*R + 0.587*G + 0.114*B;
    row += RAMP[Math.round(y/255*(RAMP.length-1))];
  }
  console.log(row);
}

// Accent map: mark cells where saturation is high
console.log("\n─── accent map (C=cyan/blue, M=magenta, .=none) ───");
const cyanCells = [], magentaCells = [];
for (let r = 0; r < ROWS; r++) {
  let row = "";
  for (let c = 0; c < COLS; c++) {
    const i = (r * COLS + c) * 3;
    const R=data[i], G=data[i+1], B=data[i+2];
    const [h, s, v] = rgbToHsv(R, G, B);
    if (s > 0.4 && v > 0.35) {
      if (h >= 160 && h <= 250) { row += "C"; cyanCells.push([r,c,R,G,B]); }
      else if ((h >= 280 && h <= 330) || h < 15 || h > 340) { row += "M"; magentaCells.push([r,c,R,G,B]); }
      else row += "?";
    } else row += " ";
  }
  console.log(row.replace(/ /g, "."));
}

// Report the actual accent colors (mean RGB of each cluster)
function mean(arr, idx) { return Math.round(arr.reduce((s,x)=>s+x[idx],0) / arr.length); }
if (cyanCells.length) {
  console.log(`\ncyan/blue accents: ${cyanCells.length} cells`);
  console.log(`  mean rgb(${mean(cyanCells,2)}, ${mean(cyanCells,3)}, ${mean(cyanCells,4)})`);
  const rr = [Math.min(...cyanCells.map(x=>x[0])), Math.max(...cyanCells.map(x=>x[0]))];
  const cc = [Math.min(...cyanCells.map(x=>x[1])), Math.max(...cyanCells.map(x=>x[1]))];
  console.log(`  bbox rows ${rr[0]}-${rr[1]}, cols ${cc[0]}-${cc[1]}`);
}
if (magentaCells.length) {
  console.log(`\nmagenta accents: ${magentaCells.length} cells`);
  console.log(`  mean rgb(${mean(magentaCells,2)}, ${mean(magentaCells,3)}, ${mean(magentaCells,4)})`);
  const rr = [Math.min(...magentaCells.map(x=>x[0])), Math.max(...magentaCells.map(x=>x[0]))];
  const cc = [Math.min(...magentaCells.map(x=>x[1])), Math.max(...magentaCells.map(x=>x[1]))];
  console.log(`  bbox rows ${rr[0]}-${rr[1]}, cols ${cc[0]}-${cc[1]}`);
}
