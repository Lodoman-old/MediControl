import { Jimp } from "jimp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function main() {
  const srcPath = join(root, "..", "mobile", "assets", "LogoMediControl.png");
  const src = await Jimp.read(srcPath);
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Crop to non-white bounding box
  let minX = w, minY = h, maxX = 0, maxY = 0;
  src.scan(0, 0, w, h, (x, y) => {
    const hex = src.getPixelColor(x, y);
    const r = (hex >> 24) & 0xff, g = (hex >> 16) & 0xff, b = (hex >> 8) & 0xff;
    if (r < 250 || g < 250 || b < 250) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = src.clone().crop({ x: minX, y: minY, w: cw, h: ch });
  console.log(`Cropped: ${cw}x${ch} (from ${w}x${h})`);

  // Make square with white padding
  const maxDim = Math.max(cw, ch);
  const square = new Jimp({ width: maxDim, height: maxDim, color: 0xffffffff });
  const padX = Math.floor((maxDim - cw) / 2);
  const padY = Math.floor((maxDim - ch) / 2);
  square.composite(cropped, padX, padY);

  const resDir = join(root, "android", "app", "src", "main", "res");

  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = join(resDir, dir);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const resized = square.resize({ w: size, h: size });
    const png = await resized.getBuffer("image/png");
    writeFileSync(join(outDir, "ic_launcher.png"), png);
    writeFileSync(join(outDir, "ic_launcher_round.png"), png);
    console.log(`Generated ${dir} (${size}x${size})`);
  }

  // Adaptive icon foreground (108x108)
  const fgSize = 108;
  const fgCanvas = new Jimp({ width: fgSize, height: fgSize, color: 0x00000000 });
  const fgScale = fgSize / maxDim;
  const fgW = Math.round(maxDim * fgScale);
  const fgH = Math.round(maxDim * fgScale);
  const fgPadX = Math.floor((fgSize - fgW) / 2);
  const fgPadY = Math.floor((fgSize - fgH) / 2);
  const fgResized = square.resize({ w: fgW, h: fgH });
  fgCanvas.composite(fgResized, fgPadX, fgPadY);

  const anydpiDir = join(resDir, "mipmap-anydpi-v26");
  if (!existsSync(anydpiDir)) mkdirSync(anydpiDir, { recursive: true });
  const fgPng = await fgCanvas.getBuffer("image/png");
  writeFileSync(join(anydpiDir, "ic_launcher_foreground.png"), fgPng);

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  writeFileSync(join(anydpiDir, "ic_launcher.xml"), xml);
  writeFileSync(join(anydpiDir, "ic_launcher_round.xml"), xml);

  // White background color for adaptive icon
  writeFileSync(join(resDir, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>`);

  console.log("Done - icons from LogoMediControl.png");
}

main().catch(console.error);
