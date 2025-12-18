// server/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the destination folder relative to server.js
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configure storage destination and filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// 2. Configure the Multer instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware for file upload: expects an array of files named 'photos' (or similar form field name)
// The field name must be consistent between frontend and backend.
exports.uploadPhotos = upload.array('photos', 5); // Allow up to 5 files