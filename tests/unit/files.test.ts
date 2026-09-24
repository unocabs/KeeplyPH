import { expect, it } from 'vitest';
import sharp from 'sharp';
import { validateFile } from '@/lib/files';
it('re-encodes images, limits dimensions, and strips metadata', async () => {
  const input = await sharp({ create: { width: 3000, height: 200, channels: 3, background: '#6153ca' } }).withMetadata({ orientation: 1 }).jpeg().toBuffer();
  const result = await validateFile(input);
  const metadata = await sharp(result.bytes).metadata();
  expect(result.mime).toBe('image/webp');
  expect(metadata.width).toBe(2400);
  expect(metadata.exif).toBeUndefined();
  expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
});
it('rejects HTML masquerading as an image and oversized input', async () => {
  await expect(validateFile(Buffer.from('<html>Not a receipt</html>'))).rejects.toThrow('valid');
  await expect(validateFile(Buffer.alloc(10 * 1024 * 1024 + 1))).rejects.toThrow('10 MB');
});
it('rejects incomplete PDFs and preserves complete PDF bytes', async () => {
  await expect(validateFile(Buffer.from('%PDF-1.7\nbroken'))).rejects.toThrow('incomplete');
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF');
  expect((await validateFile(pdf)).bytes.equals(pdf)).toBe(true);
});
