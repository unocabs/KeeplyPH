import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { MAX_FILE_BYTES } from './domain';

export async function validateFile(input: Buffer) {
  if (!input.length || input.length > MAX_FILE_BYTES) throw new Error('Use a file smaller than 10 MB.');
  let bytes: Buffer;
  let mime: string;
  if (input.subarray(0, 5).toString() === '%PDF-') {
    if (!input.subarray(-2048).toString().includes('%%EOF')) throw new Error('This PDF appears incomplete.');
    // PDFs are downloaded as attachments, never embedded on our origin.
    bytes = input; mime = 'application/pdf';
  } else {
    try {
      const image = sharp(input, { limitInputPixels: 40_000_000, animated: false, failOn: 'warning' });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('format');
      bytes = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
      mime = 'image/webp';
    } catch { throw new Error('Use a valid JPG, PNG, WebP image or PDF.'); }
  }
  if (bytes.length > MAX_FILE_BYTES) throw new Error('This file is too large after processing.');
  return { bytes, mime, checksum: createHash('sha256').update(bytes).digest('hex') };
}
