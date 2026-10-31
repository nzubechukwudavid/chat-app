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

module.exports = { upload };
