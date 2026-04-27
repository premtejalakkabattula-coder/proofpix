// ============================================================
// utils/mediaProcessor.js
// Handles watermarking (images) and SHA-256 hashing
// ============================================================

const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate SHA-256 hash of a file
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} - Hex hash string
 */
const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Apply a text watermark to an image using Sharp
 * Adds "© ProofPix Verified" at bottom-right corner
 * @param {string} inputPath - Path to the original image
 * @param {string} outputPath - Path to save the watermarked image
 * @param {string} ownerName - Owner's name to embed in watermark
 * @returns {Promise<void>}
 */
const applyWatermark = async (inputPath, outputPath, ownerName) => {
  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const { width, height } = metadata;

    // Create SVG watermark text
    const watermarkText = `© ProofPix | ${ownerName}`;
    const fontSize = Math.max(14, Math.floor(width * 0.025)); // Responsive font size
    const padding = 16;

    // Approximate text width (characters * ~0.6 * fontSize)
    const textWidth = watermarkText.length * fontSize * 0.55 + padding * 2;
    const textHeight = fontSize + padding * 2;

    const svgWatermark = `
      <svg width="${textWidth}" height="${textHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" rx="4"/>
        <text
          x="${textWidth / 2}"
          y="${textHeight / 2 + fontSize * 0.35}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          opacity="0.9"
        >${watermarkText}</text>
      </svg>
    `;

    const watermarkBuffer = Buffer.from(svgWatermark);

    // Apply watermark at bottom-right
    await sharp(inputPath)
      .composite([{
        input: watermarkBuffer,
        gravity: 'southeast', // Bottom-right corner
        blend: 'over'
      }])
      .toFile(outputPath);

  } catch (err) {
    // If watermarking fails (e.g., unsupported format), just copy the file
    console.warn('⚠️  Watermarking failed, using original:', err.message);
    fs.copyFileSync(inputPath, outputPath);
  }
};

/**
 * Process uploaded media:
 * 1. Apply watermark (images only)
 * 2. Generate SHA-256 hash
 * 3. Replace original with watermarked version
 * @param {object} file - Multer file object
 * @param {string} ownerName - Owner name for watermark
 * @returns {Promise<{hash: string, fileType: string}>}
 */
const processMedia = async (file, ownerName) => {
  const filePath = file.path;
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');

  if (isImage) {
    // Apply watermark to image
    const tempPath = filePath + '_watermarked';
    await applyWatermark(filePath, tempPath, ownerName);

    // Replace original with watermarked version
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
  }
  // For videos, watermarking requires ffmpeg (not included in MVP)
  // We still hash and store them as-is

  // Generate hash of the final file
  const hash = await generateFileHash(filePath);

  return {
    hash,
    fileType: isImage ? 'image' : 'video'
  };
};

module.exports = { processMedia, generateFileHash };
