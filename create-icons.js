/**
 * Icon Generator Script
 * Run this with Node.js to generate PNG icons
 * 
 * Usage: node create-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator for solid color icons with text
function createPNG(width, height, drawFunc) {
  // PNG file structure
  const channels = 4; // RGBA
  const rawData = Buffer.alloc(width * height * channels);

  // Draw function sets pixels
  drawFunc(rawData, width, height, channels);

  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');

  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

// Draw PromptVault icon
function drawIcon(data, width, height, channels) {
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Background - blue gradient effect
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

      // Draw a vault/document icon
      const isInIcon = drawPromptIcon(x, y, width, height);

      if (isInIcon) {
        data[idx] = 74;      // R
        data[idx + 1] = 158;  // G
        data[idx + 2] = 255;  // B
        data[idx + 3] = 255;  // A
      } else {
        // Transparent background
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }
}

function drawPromptIcon(x, y, width, height) {
  const padding = width * 0.15;
  const left = padding;
  const top = padding;
  const right = width - padding;
  const bottom = height - padding;

  // Document outline
  if (x >= left && x <= right && y >= top && y <= bottom) {
    // Document background (white)
    if (x > left + 1 && x < right - 1 && y > top + 1 && y < bottom - 1) {
      // Lines on document
      const lineTop = top + height * 0.25;
      const lineSpacing = height * 0.15;

      for (let i = 0; i < 3; i++) {
        const lineY = lineTop + i * lineSpacing;
        const lineLeft = left + width * 0.15;
        const lineRight = right - width * 0.15;

        if (y >= lineY && y <= lineY + height * 0.05 &&
            x >= lineLeft && x <= lineRight) {
          return true;
        }
      }

      return false; // White background
    }
    return true; // Border
  }

  return false;
}

// Generate icons
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const png = createPNG(size, size, drawIcon);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${filePath}`);
});

console.log('Icons generated successfully!');
