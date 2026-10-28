import fs from 'node:fs';
import crypto from 'node:crypto';
import ExifReader from 'exifreader';

const filePath = 'C:/Users/nites/.gemini/antigravity/brain/d3fb7d74-a7db-466e-957d-88667c42d0af/.user_uploaded/media_1793208146532_5ae5c6e4.jpg';

async function analyze() {
  const fileBytes = fs.readFileSync(filePath);
  const size = fileBytes.length;

  // 1. SHA-256
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

  // 2. Magic bytes
  const isJpeg = fileBytes[0] === 0xff && fileBytes[1] === 0xd8;

  // 3. ExifReader
  let tags = {};
  try {
    tags = ExifReader.load(fileBytes.buffer, { expanded: true });
  } catch (err) {
    console.error('ExifReader error:', err.message);
  }

  // 4. Check for JUMBF / C2PA marker (0xFFE1 with 'http://ns.c2pa.org/jumbf/' or 'c2pa')
  const binaryString = fileBytes.toString('binary');
  const hasC2paString = binaryString.includes('c2pa') || binaryString.includes('jumbf');
  const hasAdobeString = binaryString.includes('Adobe');
  const hasMidjourneyString = binaryString.includes('Midjourney') || binaryString.includes('midjourney');
  const hasDalleString = binaryString.includes('DALL-E') || binaryString.includes('dalle');
  const hasStableDiffusion = binaryString.includes('Stable Diffusion') || binaryString.includes('steps:');

  // Find all text strings of interest
  const interestingKeywords = [
    'Software', 'Photoshop', 'GIMP', 'Lightroom', 'Prompt', 'Negative', 'Seed', 'Model',
    'Creator', 'Artist', 'Copyright', 'Camera', 'iPhone', 'Canon', 'Nikon', 'Sony',
    'Nightmare', 'Leonardo', 'NovelAI', 'InvokeAI', 'ComfyUI', 'automatic1111'
  ];

  const matchedKeywords = {};
  for (const kw of interestingKeywords) {
    if (new RegExp(kw, 'i').test(binaryString)) {
      matchedKeywords[kw] = true;
    }
  }

  console.log(JSON.stringify({
    filePath,
    sizeBytes: size,
    sha256,
    isJpeg,
    hasC2paString,
    hasAdobeString,
    hasMidjourneyString,
    hasDalleString,
    hasStableDiffusion,
    matchedKeywords,
    exifOverview: {
      hasExif: !!tags.exif,
      hasIptc: !!tags.iptc,
      hasXmp: !!tags.xmp,
      hasFile: !!tags.file,
      fileTags: tags.file,
      exifTags: tags.exif,
      xmpTags: tags.xmp,
      iptcTags: tags.iptc,
    }
  }, null, 2));
}

analyze();

