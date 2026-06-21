// Quick icon generator - Run with Node.js
// This creates simple PNG icons for the extension

const fs = require('fs');
const path = require('path');

// Minimal PNG generator for solid color squares with rounded corners
function createIconPNG(size) {
  // Create SVG and convert to PNG using base64
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size*0.15}" fill="#4a9eff"/>
    <rect x="${size*0.2}" y="${size*0.2}" width="${size*0.6}" height="${size*0.6}" rx="${size*0.05}" fill="white"/>
    <rect x="${size*0.3}" y="${size*0.35}" width="${size*0.4}" height="${size*0.06}" fill="#4a9eff"/>
    <rect x="${size*0.3}" y="${size*0.45}" width="${size*0.35}" height="${size*0.06}" fill="#4a9eff"/>
    <rect x="${size*0.3}" y="${size*0.55}" width="${size*0.3}" height="${size*0.06}" fill="#4a9eff"/>
  </svg>`;

  // Convert SVG to base64
  const base64 = Buffer.from(svg).toString('base64');
  return base64;
}

// For now, let's create placeholder PNGs using a different method
// We'll create minimal valid PNG files

function createMinimalPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Create raw image data
  const rawData = Buffer.alloc(height * (1 + width * 3)); // filter byte + RGB
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    rawData[offset] = 0; // filter: none

    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3;

      // Create a simple icon shape
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist < width * 0.4) {
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      } else {
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      }
    }
  }

  // Compress
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');

  // CRC32
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);

  // Generate table
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  // Calculate CRC
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create simple blue circle icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const png = createMinimalPNG(size, size, 74, 158, 255);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${filePath} (${png.length} bytes)`);
});

console.log('\nIcons generated successfully!');
console.log('Note: These are simple solid-color icons.');
console.log('For better icons, open icons/generate-icons.html in a browser and download the icons.');
