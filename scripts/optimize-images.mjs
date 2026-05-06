import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const RESPONSIVE_WIDTHS = [400, 800, 1200];
const MAX_WIDTH = 1200;
const THUMBNAIL_TARGET_BYTES = 100 * 1024;
const STANDARD_TARGET_BYTES = 300 * 1024;
const MAX_QUALITY = 88;
const MIN_QUALITY = 70;
const QUALITY_STEP = 4;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const GENERATED_VARIANT_PATTERN = /-\d{2,4}\.(webp|avif)$/i;

const inputArgs = process.argv.slice(2);
const inputPaths = inputArgs.length > 0 ? inputArgs : ["public"];

const isImageFile = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return (
    IMAGE_EXTENSIONS.has(extension) &&
    !GENERATED_VARIANT_PATTERN.test(path.basename(filePath))
  );
};

const toSafeBaseName = (filePath) => {
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "image";
};

const collectImageFiles = async (targetPath) => {
  const stat = await fs.stat(targetPath);

  if (stat.isFile()) {
    return isImageFile(targetPath) ? [targetPath] : [];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => collectImageFiles(path.join(targetPath, entry.name)))
  );

  return nestedFiles.flat();
};

const getOutputWidths = (sourceWidth) => {
  const cappedWidth = Math.min(sourceWidth, MAX_WIDTH);
  return RESPONSIVE_WIDTHS.filter((width) => width <= cappedWidth)
    .concat(cappedWidth)
    .filter((width, index, list) => list.indexOf(width) === index)
    .sort((a, b) => a - b);
};

const formatBytes = (bytes) => {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10}KB`;
  }

  return `${Math.round(bytes / 1024 / 102.4) / 10}MB`;
};

const encodeWebp = async (filePath, width, targetBytes) => {
  let best = null;

  for (
    let quality = MAX_QUALITY;
    quality >= MIN_QUALITY;
    quality -= QUALITY_STEP
  ) {
    const buffer = await sharp(filePath)
      .rotate()
      .resize({
        width,
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();

    best = { buffer, quality };

    if (buffer.byteLength <= targetBytes) {
      return best;
    }
  }

  return best;
};

const optimizeImage = async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  const sourceWidth = metadata.width || 0;

  if (sourceWidth <= 0) {
    console.warn(`skip ${filePath}: unknown image width`);
    return [];
  }

  const sourceSize = (await fs.stat(filePath)).size;
  const baseName = toSafeBaseName(filePath);
  const outputWidths = getOutputWidths(sourceWidth);
  const outputFiles = [];

  for (const width of outputWidths) {
    const targetBytes =
      width <= RESPONSIVE_WIDTHS[0]
        ? THUMBNAIL_TARGET_BYTES
        : STANDARD_TARGET_BYTES;
    const result = await encodeWebp(filePath, width, targetBytes);

    if (!result) {
      continue;
    }

    const outputPath = path.join(path.dirname(filePath), `${baseName}-${width}.webp`);
    await fs.writeFile(outputPath, result.buffer);
    outputFiles.push({
      path: outputPath,
      size: result.buffer.byteLength,
      quality: result.quality,
      width,
    });
  }

  console.log(
    `${filePath} ${formatBytes(sourceSize)} -> ${outputFiles
      .map(
        (item) =>
          `${path.basename(item.path)} ${formatBytes(item.size)} q${item.quality}`
      )
      .join(", ")}`
  );

  return outputFiles;
};

const imageFiles = (
  await Promise.all(inputPaths.map((targetPath) => collectImageFiles(targetPath)))
).flat();

if (imageFiles.length === 0) {
  console.log("No input images found.");
  process.exit(0);
}

for (const filePath of imageFiles) {
  await optimizeImage(filePath);
}
