export const RESPONSIVE_IMAGE_WIDTHS = [400, 800, 1200] as const;

const WEBP_MIME_TYPE = "image/webp";
const JPEG_MIME_TYPE = "image/jpeg";
const DEFAULT_UPLOAD_MIME_TYPE = JPEG_MIME_TYPE;
const OPTIMIZABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const THUMBNAIL_TARGET_BYTES = 100 * 1024;
const STANDARD_TARGET_BYTES = 300 * 1024;
const MAX_IMAGE_WIDTH = 1200;
const MAX_QUALITY = 0.88;
const MIN_QUALITY = 0.7;
const QUALITY_STEP = 0.04;

export type OptimizedImageVariant = {
  file: File;
  width: number;
  height: number;
  size: number;
};

type OptimizeImageOptions = {
  widths?: readonly number[];
  maxWidth?: number;
  mimeType?: string;
  thumbnailTargetBytes?: number;
  standardTargetBytes?: number;
  fallbackToOriginal?: boolean;
};

const mimeSupportCache = new Map<string, Promise<boolean>>();

export const isOptimizableImageFile = (file: File) => {
  return OPTIMIZABLE_IMAGE_TYPES.has(file.type);
};

const getSupportedOutputMimeType = async (preferredMimeType: string) => {
  if (await canEncodeMimeType(preferredMimeType)) {
    return preferredMimeType;
  }

  if (await canEncodeMimeType(WEBP_MIME_TYPE)) {
    return WEBP_MIME_TYPE;
  }

  return JPEG_MIME_TYPE;
};

const canEncodeMimeType = (mimeType: string) => {
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  const cached = mimeSupportCache.get(mimeType);
  if (cached) {
    return cached;
  }

  const result = new Promise<boolean>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob(
      (blob) => resolve(Boolean(blob && blob.type === mimeType)),
      mimeType,
      0.8
    );
  });

  mimeSupportCache.set(mimeType, result);
  return result;
};

const loadImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const getSafeBaseName = (fileName: string) => {
  const rawBaseName = fileName.replace(/\.[^.]+$/, "") || "image";
  const safeName = rawBaseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "image";
};

const getExtensionForMimeType = (mimeType: string) => {
  if (mimeType === "image/avif") {
    return "avif";
  }

  if (mimeType === JPEG_MIME_TYPE) {
    return "jpg";
  }

  return "webp";
};

const getOutputWidths = (
  sourceWidth: number,
  widths: readonly number[],
  maxWidth: number
) => {
  const cappedSourceWidth = Math.min(sourceWidth, maxWidth);
  const outputWidths = widths
    .filter((width) => width > 0 && width <= cappedSourceWidth)
    .concat(cappedSourceWidth)
    .filter((width, index, list) => list.indexOf(width) === index)
    .sort((a, b) => a - b);

  return outputWidths.length > 0 ? outputWidths : [cappedSourceWidth];
};

const resizeIntoCanvas = (
  image: HTMLImageElement,
  targetWidth: number,
  sourceWidth: number,
  sourceHeight: number
) => {
  const targetHeight = Math.max(
    1,
    Math.round((sourceHeight / sourceWidth) * targetWidth)
  );
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("Canvas tidak tersedia.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return { canvas, height: targetHeight };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal mengoptimalkan gambar."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });

const encodeCanvas = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  targetBytes: number
) => {
  let bestBlob = await canvasToBlob(canvas, mimeType, MAX_QUALITY);

  if (bestBlob.size <= targetBytes) {
    return bestBlob;
  }

  for (
    let quality = MAX_QUALITY - QUALITY_STEP;
    quality >= MIN_QUALITY;
    quality -= QUALITY_STEP
  ) {
    const blob = await canvasToBlob(canvas, mimeType, Number(quality.toFixed(2)));
    bestBlob = blob;

    if (blob.size <= targetBytes) {
      return blob;
    }
  }

  return bestBlob;
};

export const optimizeImageFileToVariants = async (
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageVariant[]> => {
  const fallbackToOriginal = options.fallbackToOriginal ?? true;

  if (!isOptimizableImageFile(file) || typeof window === "undefined") {
    return fallbackToOriginal
      ? [{ file, width: 0, height: 0, size: file.size }]
      : [];
  }

  try {
    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error("Dimensi gambar tidak valid.");
    }

    const outputMimeType = await getSupportedOutputMimeType(
      options.mimeType || DEFAULT_UPLOAD_MIME_TYPE
    );
    const extension = getExtensionForMimeType(outputMimeType);
    const baseName = getSafeBaseName(file.name);
    const outputWidths = getOutputWidths(
      sourceWidth,
      options.widths || RESPONSIVE_IMAGE_WIDTHS,
      options.maxWidth || MAX_IMAGE_WIDTH
    );

    const variants: OptimizedImageVariant[] = [];

    for (const width of outputWidths) {
      const { canvas, height } = resizeIntoCanvas(
        image,
        width,
        sourceWidth,
        sourceHeight
      );
      const targetBytes =
        width <= RESPONSIVE_IMAGE_WIDTHS[0]
          ? options.thumbnailTargetBytes || THUMBNAIL_TARGET_BYTES
          : options.standardTargetBytes || STANDARD_TARGET_BYTES;
      const blob = await encodeCanvas(canvas, outputMimeType, targetBytes);
      const optimizedFile = new File([blob], `${baseName}-${width}.${extension}`, {
        type: outputMimeType,
        lastModified: Date.now(),
      });

      variants.push({
        file: optimizedFile,
        width,
        height,
        size: optimizedFile.size,
      });
    }

    return variants;
  } catch (error) {
    if (!fallbackToOriginal) {
      throw error;
    }

    return [{ file, width: 0, height: 0, size: file.size }];
  }
};

export const optimizeImageFileForUpload = async (
  file: File,
  options?: OptimizeImageOptions
) => {
  const variants = await optimizeImageFileToVariants(file, options);
  return variants[variants.length - 1]?.file ?? file;
};

export const optimizeImageFilesForUpload = async (
  files: File[],
  options?: OptimizeImageOptions
) => {
  const optimizedFiles: File[] = [];

  for (const file of files) {
    optimizedFiles.push(await optimizeImageFileForUpload(file, options));
  }

  return optimizedFiles;
};
