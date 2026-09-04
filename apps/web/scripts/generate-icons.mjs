import { Jimp } from "jimp";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resDir = join(__dirname, "..", "android", "app", "src", "main", "res");
const srcPath = join(__dirname, "..", "..", "mobile", "assets", "LogoMediControl.png");

const DENSITIES = {
  "mipmap-mdpi-v4": 48,
  "mipmap-hdpi-v4": 72,
  "mipmap-xhdpi-v4": 96,
  "mipmap-xxhdpi-v4": 144,
  "mipmap-xxxhdpi-v4": 192,
};

async function main() {
  const src = await Jimp.read(srcPath);
  const sw = src.bitmap.width, sh = src.bitmap.height;

  // Crop to visible content (non-transparent)
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  src.scan(0, 0, sw, sh, (x, y) => {
    const a = src.getPixelColor(x, y) & 255;
    if (a > 10) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  console.log(`Logo content: ${cw}x${ch}`);

  const cropped = src.clone().crop({ x: minX, y: minY, w: cw, h: ch });

  // Make square with transparent padding
  const maxDim = Math.max(cw, ch);
  const square = new Jimp({ width: maxDim, height: maxDim, color: 0x00000000 });
  square.composite(cropped, Math.floor((maxDim - cw) / 2), Math.floor((maxDim - ch) / 2));

  for (const [dir, size] of Object.entries(DENSITIES)) {
    const outDir = join(resDir, dir);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const pad = Math.floor(size * 0.1);
    const maxLogo = size - pad * 2;
    const scale = maxLogo / maxDim;
    const lw = Math.floor(maxDim * scale), lh = Math.floor(maxDim * scale);
    const logo = square.clone().resize({ w: lw, h: lh });

    // White background + logo
    const icon = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
    icon.composite(logo, Math.floor((size - lw) / 2), Math.floor((size - lh) / 2));
    const buf = await icon.getBuffer("image/png");
    writeFileSync(join(outDir, "ic_launcher.png"), buf);
    writeFileSync(join(outDir, "ic_launcher_round.png"), buf);

    console.log(`${dir} (${size}x${size}) done`);
  }

  console.log("DONE - ISOPO logo on white in v4 dirs only");
}

main().catch(console.error);
