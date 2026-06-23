import { Jimp } from "jimp";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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
  const srcPath = join(root, "public", "isopo.png");
  const src = await Jimp.read(srcPath);
  const maxDim = Math.max(src.bitmap.width, src.bitmap.height);

  // Create square canvas with white background
  const square = new Jimp({ width: maxDim, height: maxDim, color: 0xffffffff });
  const padX = Math.floor((maxDim - src.bitmap.width) / 2);
  const padY = Math.floor((maxDim - src.bitmap.height) / 2);
  square.composite(src, padX, padY);

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

  // Create adaptive icon XML for Android 8+
  const anydpiDir = join(resDir, "mipmap-anydpi-v26");
  if (!existsSync(anydpiDir)) mkdirSync(anydpiDir, { recursive: true });

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;

  writeFileSync(join(anydpiDir, "ic_launcher.xml"), adaptiveXml);
  writeFileSync(join(anydpiDir, "ic_launcher_round.xml"), adaptiveXml);

  // Generate foreground (108dp viewport for adaptive icon, no background)
  const foregroundSize = 108;
  const fg = new Jimp({ width: foregroundSize, height: foregroundSize, color: 0x00000000 });
  const fgScale = foregroundSize / maxDim;
  const fgW = Math.round(src.bitmap.width * fgScale);
  const fgH = Math.round(src.bitmap.height * fgScale);
  const fgX = Math.floor((foregroundSize - fgW) / 2);
  const fgY = Math.floor((foregroundSize - fgH) / 2);
  const srcResized = src.resize({ w: fgW, h: fgH });
  fg.composite(srcResized, fgX, fgY);

  const fgPng = await fg.getBuffer("image/png");
  writeFileSync(join(anydpiDir, "ic_launcher_foreground.png"), fgPng);
  console.log("Generated adaptive icon foreground (108x108)");

  square.dispose();
  src.dispose();
  console.log("Done - all icons generated from isopo.png");
}

main().catch(console.error);
