const multer = require('multer');

/**
 * Avatars are held in memory just long enough to hand them to Stream's CDN.
 * Nothing is written to local disk, so a redeploy cannot lose a profile photo.
 */
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, GIF or WebP images are allowed.'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

/**
 * The browser-supplied MIME type is only a hint. Check the file signature so a
 * renamed text file (or anything else) cannot be stored as an avatar.
 */
const isSupportedImage = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  const startsWith = (bytes) => buffer.subarray(0, bytes.length).equals(Buffer.from(bytes));
  const ascii = (start, end) => buffer.subarray(start, end).toString('ascii');

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isGif = ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a';
  const isWebp = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';

  return isJpeg || isPng || isGif || isWebp;
};

module.exports = { upload, isSupportedImage };
