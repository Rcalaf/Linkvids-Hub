
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i)) {
            return cb(new Error('Only image files and documents are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware export
exports.uploadPhotos = upload.array('photos', 5);