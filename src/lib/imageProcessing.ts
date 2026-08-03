import sharp from "sharp";

// Applied to logo uploads only (not product photos — trimming/recompressing
// real photography would be wrong). Auto-trims uniform-color/transparent
// padding around the mark, then caps it to a sane bounding box so the
// stored file is already close to what any header/sidebar/login slot needs,
// rather than shipping whatever huge export the admin happened to upload.
const MAX_WIDTH = 480;
const MAX_HEIGHT = 160;

export async function processLogoImage(buffer: Buffer): Promise<{ buffer: Buffer; ext: string }> {
  let pipeline = sharp(buffer, { failOn: "none" });

  try {
    // trim() throws on a few edge cases (e.g. a perfectly uniform image
    // with nothing to trim) — fall back to the untrimmed pipeline rather
    // than fail the whole upload over a cosmetic step.
    const trimmed = sharp(buffer, { failOn: "none" }).trim();
    await trimmed.toBuffer();
    pipeline = trimmed;
  } catch {
    // keep the untrimmed pipeline
  }

  const output = await pipeline
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { buffer: output, ext: ".png" };
}
