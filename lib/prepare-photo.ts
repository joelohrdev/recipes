// Turns a photo picked on the device into a small JPEG for upload.
//
// Browser-only. iPad Safari can fail here in quiet ways: a canvas that is too
// large or holds too much memory exports as an empty image rather than throwing.
// So every result is checked, smaller sizes are retried, and canvases are freed.

export type PreparedPhoto = { mediaType: "image/jpeg"; data: string };

export class PhotoError extends Error {}

const MIN_JPEG_BYTES = 2_000;

export async function preparePhoto(file: File, maxEdge: number): Promise<PreparedPhoto> {
  let source: Blob = file;
  let turns = 0; // quarter turns clockwise still needed after decoding
  if (isRaw(file)) {
    // RAW photos (Apple ProRAW and other DNGs) carry a ready-made JPEG copy.
    const buffer = await file.arrayBuffer();
    const preview = largestEmbeddedJpeg(new Uint8Array(buffer));
    if (!preview) {
      throw new PhotoError(
        "This RAW photo can't be read. Take it again with ProRAW turned off, or choose a regular photo.",
      );
    }
    source = preview.blob;
    // If the copy has its own rotation tag the browser applies it while decoding.
    // Otherwise use the rotation recorded in the DNG.
    if (preview.orientation === null) turns = quarterTurns(tiffOrientation(new DataView(buffer), 0));
  }

  const image = await decode(source);
  try {
    if (!image.width || !image.height) throw new PhotoError("This photo couldn't be opened.");
    for (const edge of [maxEdge, 1200, 900]) {
      const blob = await drawJpeg(image.draw, image.width, image.height, edge, turns);
      if (blob && blob.size >= MIN_JPEG_BYTES) {
        return { mediaType: "image/jpeg", data: await toBase64(blob) };
      }
    }
  } finally {
    image.close();
  }
  throw new PhotoError("This photo couldn't be prepared. Try a different photo, or restart Safari.");
}

function isRaw(file: File) {
  return /\.dng$/i.test(file.name) || /dng|raw/i.test(file.type);
}

type Decoded = {
  width: number;
  height: number;
  draw: CanvasImageSource;
  close: () => void;
};

async function decode(blob: Blob): Promise<Decoded> {
  // createImageBitmap respects the photo's rotation and avoids an <img> element.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { width: bitmap.width, height: bitmap.height, draw: bitmap, close: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which some formats still need.
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoError("This photo's format can't be opened here. Try a JPEG or HEIC photo.");
  }
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: img,
    close: () => URL.revokeObjectURL(url),
  };
}

async function drawJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
  turns: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const sideways = turns % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((turns * Math.PI) / 2);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch {
    return null;
  } finally {
    // Safari keeps canvas memory until the canvas is shrunk; release it now.
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function toBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Finds the biggest JPEG stored inside a RAW file by scanning for JPEG start
 * markers and reading each image's size from its frame header.
 */
function largestEmbeddedJpeg(
  data: Uint8Array<ArrayBuffer>,
): { blob: Blob; orientation: number | null } | null {
  let best: { start: number; end: number; area: number } | null = null;

  for (let start = 0; start < data.length - 3; start++) {
    if (data[start] !== 0xff || data[start + 1] !== 0xd8 || data[start + 2] !== 0xff) continue;
    let i = start + 2;
    let area = 0;
    let end = -1;
    while (i + 4 <= data.length && data[i] === 0xff) {
      const marker = data[i + 1];
      if (marker === 0xd9) {
        end = i + 2;
        break;
      }
      const length = (data[i + 2] << 8) | data[i + 3];
      // Baseline (C0), extended (C1) and progressive (C2) frames are viewable.
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const h = (data[i + 5] << 8) | data[i + 6];
        const w = (data[i + 7] << 8) | data[i + 8];
        area = w * h;
      }
      if (marker === 0xda) {
        // Image data follows; the image ends at the next end-of-image marker.
        for (let j = i + 2 + length; j < data.length - 1; j++) {
          if (data[j] === 0xff && data[j + 1] === 0xd9) {
            end = j + 2;
            break;
          }
        }
        break;
      }
      i += 2 + length;
    }
    if (end > start && area > 0 && (!best || area > best.area)) best = { start, end, area };
    if (end > start) start = end - 1;
  }
  if (!best) return null;
  const jpeg = data.slice(best.start, best.end);
  return { blob: new Blob([jpeg], { type: "image/jpeg" }), orientation: jpegExifOrientation(jpeg) };
}

/** The TIFF orientation tag (1 to 8) of the first image directory, or null if absent. */
function tiffOrientation(view: DataView, start: number): number | null {
  try {
    const little = view.getUint16(start) === 0x4949; // "II" little-endian, "MM" big-endian
    const ifd = start + view.getUint32(start + 4, little);
    const count = view.getUint16(ifd, little);
    for (let n = 0; n < count; n++) {
      const entry = ifd + 2 + n * 12;
      if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
    }
  } catch {
    // Not a readable TIFF header.
  }
  return null;
}

/** The orientation tag inside a JPEG's Exif block, or null if it has none. */
function jpegExifOrientation(jpeg: Uint8Array<ArrayBuffer>): number | null {
  const view = new DataView(jpeg.buffer);
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    const length = view.getUint16(i + 2);
    // APP1 starting with "Exif\0\0" holds a small TIFF structure.
    if (marker === 0xe1 && view.getUint32(i + 4) === 0x45786966) return tiffOrientation(view, i + 10);
    if (marker === 0xda) break;
    i += 2 + length;
  }
  return null;
}

/** Clockwise quarter turns for an orientation value; mirrored values are ignored. */
function quarterTurns(orientation: number | null) {
  return orientation === 6 ? 1 : orientation === 3 ? 2 : orientation === 8 ? 3 : 0;
}
