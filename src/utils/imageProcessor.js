import sharp from 'sharp';
import logger from './logger.js';

// Claude's max image size is 5MB, we target 4.5MB to leave some buffer
const MAX_IMAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

/**
 * Compress and convert image to WebP format
 * @param {string} base64Data - Base64 encoded image data (without data URL prefix)
 * @param {string} mimeType - Original MIME type (e.g., 'image/png')
 * @returns {Promise<{data: string, mimeType: string}>} - Compressed WebP base64 data
 */
export async function compressImage(base64Data, mimeType) {
  try {
    const inputBuffer = Buffer.from(base64Data, 'base64');
    const inputSize = inputBuffer.length;
    
    // If already small enough and is WebP, return as-is
    if (inputSize <= MAX_IMAGE_SIZE && mimeType === 'image/webp') {
      return { data: base64Data, mimeType };
    }
    
    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();
    
    // Start with quality 85 and reduce if needed
    let quality = 85;
    let outputBuffer;
    let attempts = 0;
    const maxAttempts = 5;
    
    // Calculate initial scale factor based on input size
    let scaleFactor = 1;
    if (inputSize > MAX_IMAGE_SIZE * 2) {
      // For very large images, start with some downscaling
      scaleFactor = Math.sqrt(MAX_IMAGE_SIZE / inputSize);
    }
    
    while (attempts < maxAttempts) {
      let pipeline = sharp(inputBuffer);
      
      // Apply scaling if needed
      if (scaleFactor < 1) {
        const newWidth = Math.round(metadata.width * scaleFactor);
        const newHeight = Math.round(metadata.height * scaleFactor);
        pipeline = pipeline.resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Convert to WebP
      outputBuffer = await pipeline
        .webp({ quality, effort: 4 })
        .toBuffer();
      
      if (outputBuffer.length <= MAX_IMAGE_SIZE) {
        break;
      }
      
      // Reduce quality or scale for next attempt
      if (quality > 50) {
        quality -= 15;
      } else {
        scaleFactor *= 0.8;
        quality = 70; // Reset quality when scaling down
      }
      attempts++;
    }
    
    const outputSize = outputBuffer.length;
    const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(1);
    
    if (outputSize < inputSize) {
      logger.info(`Image compressed: ${(inputSize / 1024 / 1024).toFixed(2)}MB → ${(outputSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`);
    }
    
    return {
      data: outputBuffer.toString('base64'),
      mimeType: 'image/webp'
    };
  } catch (error) {
    logger.warn(`Image compression failed, using original: ${error.message}`);
    // Return original on failure
    return { data: base64Data, mimeType };
  }
}
