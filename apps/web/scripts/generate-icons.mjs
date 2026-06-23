import { Jimp } from "jimp";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const BG_COLOR = 0xff26a69a; // teal primary color
const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

function isWhite(r, g, b) {
  return r > 240 && g > 240 && b > 240;
}

async function main() {
  const srcPath = join(root, "public", "isopo.png");
  const src = await Jimp.read(srcPath);
  const w = src.bitmap.width;
  const h = src.bitmap.height;

  // Make white pixels transparent
  src.scan(0, 0, w, h, (x, y) => {
    const hex = src.getPixelColor(x, y);
    const r = (hex >> 24) & 0xff;
    const g = (hex >> 16) & 0xff;
    const b = (hex >> 8) & 0xff;
    if (isWhite(r, g, b)) {
      src.setPixelColor(0x00000000, x, y);
    }
  });

  // Crop to actual content bounding box (remove excess white)
  let minX = w, minY = h, maxX = 0, maxY = 0;
  src.scan(0, 0, w, h, (x, y) => {
    const a = src.getPixelColor(x, y) & 0xff;
    if (a > 0) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = src.clone().crop({ x: minX, y: minY, w: cw, h: ch });
  console.log(`Cropped logo: ${cw}x${ch} (was ${w}x${h})`);

  // Create square canvas with teal background
  const maxDim = Math.max(cw, ch);
  const iconSize = 216; // base size for scaling (2x the largest mipmap)

  // Scale cropped logo to fit with padding
  const padding = 0.15; // 15% padding around the logo
  const availableSize = iconSize * (1 - padding * 2);
  const scale = availableSize / maxDim;
  const scaledW = Math.round(cw * scale);
  const scaledH = Math.round(ch * scale);
  const resizedLogo = cropped.resize({ w: scaledW, h: scaledH });

  const resDir = join(root, "android", "app", "src", "main", "res");

  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = join(resDir, dir);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // Create square with background color
    const canvas = new Jimp({ width: size, height: size, color: BG_COLOR });
    // Composite the resized logo on teal background
    const scaleFactor = size / iconSize;
    const logoW = Math.round(scaledW * scaleFactor);
    const logoH = Math.round(scaledH * scaleFactor);
    const lpad = Math.floor((size - logoW) / 2);
    const tpad = Math.floor((size - logoH) / 2);
    const logoResized = resizedLogo.resize({ w: logoW, h: logoH });
    canvas.composite(logoResized, lpad, tpad);

    const png = await canvas.getBuffer("image/png");
    writeFileSync(join(outDir, "ic_launcher.png"), png);
    writeFileSync(join(outDir, "ic_launcher_round.png"), png);
    console.log(`Generated ${dir} (${size}x${size})`);
  }

  // Adaptive icon foreground (108x108dp viewport)
  const fgSize = 108;
  const fgScale = fgSize / iconSize;
  const fgW = Math.round(scaledW * fgScale);
  const fgH = Math.round(scaledH * fgScale);
  const fgPadX = Math.floor((fgSize - fgW) / 2);
  const fgPadY = Math.floor((fgSize - fgH) / 2);
  const fgCanvas = new Jimp({ width: fgSize, height: fgSize, color: 0x00000000 });
  const fgLogo = resizedLogo.resize({ w: fgW, h: fgH });
  fgCanvas.composite(fgLogo, fgPadX, fgPadY);

  const anydpiDir = join(resDir, "mipmap-anydpi-v26");
  if (!existsSync(anydpiDir)) mkdirSync(anydpiDir, { recursive: true });

  const fgPng = await fgCanvas.getBuffer("image/png");
  writeFileSync(join(anydpiDir, "ic_launcher_foreground.png"), fgPng);

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  writeFileSync(join(anydpiDir, "ic_launcher.xml"), adaptiveXml);
  writeFileSync(join(anydpiDir, "ic_launcher_round.xml"), adaptiveXml);

  // Change background color in values XML
  const bgXmlPath = join(resDir, "values", "ic_launcher_background.xml");
  writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#26A69A</color>
</resources>`);

  console.log("Generated adaptive icon foreground (108x108)");
  console.log("Done - all icons generated with teal background");
}

main().catch(console.error);
