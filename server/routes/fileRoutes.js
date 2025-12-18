// server/routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const { uploadPhotos } = require('../middleware/uploadMiddleware');
const fileController = require('../controllers/s3FileController');

// Route for handling file uploads linked to a specific user and stored under a specific attribute slug
router.post('/upload/:userId', uploadPhotos, fileController.handlePhotoUpload);
router.delete('/delete/:userId', fileController.handlePhotoDeletion);

module.exports = router;