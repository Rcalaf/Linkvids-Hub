// server/controllers/fileController.js
const Collaborator = require('../models/Collaborator'); 
const mongoose = require('mongoose');
const fs = require('fs/promises'); // For file system operations (deleting the file)
const path = require('path');

// --- Helper function to delete file from disk ---
const deleteFileFromDisk = async (filePath) => {
    // filePath is like '/uploads/filename.png'
    const absolutePath = path.join(__dirname, '..', 'public', filePath);
    try {
        await fs.unlink(absolutePath);
        console.log(`Successfully deleted file: ${absolutePath}`);
    } catch (error) {
        // Log a warning if the file doesn't exist (e.g., already deleted or path mismatch)
        if (error.code === 'ENOENT') {
            console.warn(`File not found on disk, skipping deletion: ${absolutePath}`);
        } else {
            console.error(`Failed to delete file ${absolutePath}:`, error);
            throw new Error('Failed to delete file from disk.');
        }
    }
};

// --- POST: Handle Upload ---
exports.handlePhotoUpload = async (req, res) => {
    const { userId } = req.params; 
    const { attributeSlug } = req.body; 

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files were uploaded.' });
    }
    if (!attributeSlug || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Missing required data or Invalid User ID.' });
    }

    try {
        const newPhotoObjects = req.files.map(file => ({
            path: `/uploads/${file.filename}`, 
            uploadedAt: new Date(),
            name: file.originalname
        }));

        const user = await Collaborator.findById(userId).exec();
        if (!user) {
            // NOTE: Logically, you should delete the newly uploaded files here too
            return res.status(404).json({ message: 'User not found.' });
        }

        if (attributeSlug === 'profile_picture') {
             // Take the first uploaded file and save it as a string
             user.profile_picture = newPhotoObjects[0].path;
             await user.save();
             
             return res.json({ 
                message: 'Profile picture updated successfully!', 
                // Return as an array [path] so the existing frontend manager can display it easily if needed
                photos: [{ path: user.profile_picture }] 
            });
        }

        const existingArray = user.groupSpecificAttributes[attributeSlug] || [];
        user.groupSpecificAttributes[attributeSlug] = [...existingArray, ...newPhotoObjects];
        
        user.markModified('groupSpecificAttributes');

        await user.save();

        res.json({ 
            message: 'Photos uploaded successfully and saved to dynamic attribute!', 
            photos: user.groupSpecificAttributes[attributeSlug] 
        });

    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ message: 'Failed to process photo upload.' });
    }
};

// --- DELETE: Handle Deletion ---
exports.handlePhotoDeletion = async (req, res) => {
    const { userId } = req.params;
    // Data passed via query parameters or body for DELETE request
    const { attributeSlug, photoPath } = req.body; 

    if (!attributeSlug || !photoPath || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Missing required deletion parameters.' });
    }

    try {
        // 1. Delete file from disk first (fail fast if necessary)
        await deleteFileFromDisk(photoPath);

        // 2. Find and update the user document in the database
        const user = await Collaborator.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (attributeSlug === 'profile_picture') {
            
            // Just set the root field to null
            user.profile_picture = null;
            
            await user.save();

            return res.json({
                message: 'Profile picture deleted successfully!',
                photos: [] // Return empty array to clear frontend state
            });

        } else {
            // --- EXISTING LOGIC FOR DYNAMIC ATTRIBUTES ---
            const existingArray = user.groupSpecificAttributes[attributeSlug] || [];
            
            // Filter out the photo object that matches the path
            const updatedArray = existingArray.filter(photo => photo.path !== photoPath);
            
            // Replace the old array
            user.groupSpecificAttributes[attributeSlug] = updatedArray;

            // CRITICAL: Mark schema path as modified
            user.markModified('groupSpecificAttributes');

            await user.save();

            return res.json({ 
                message: 'Photo deleted successfully!', 
                photos: user.groupSpecificAttributes[attributeSlug] 
            });
        }

        // const existingArray = user.groupSpecificAttributes[attributeSlug] || [];
        
        // // Filter out the photo object that matches the path
        // const updatedArray = existingArray.filter(photo => photo.path !== photoPath);
        
        // // Replace the old array with the filtered one
        // user.groupSpecificAttributes[attributeSlug] = updatedArray;

        // // CRITICAL: Mark the Mixed schema path as modified
        // user.markModified('groupSpecificAttributes');

        // await user.save();

        // res.json({ 
        //     message: 'Photo deleted successfully!', 
        //     photos: user.groupSpecificAttributes[attributeSlug] // Return the new full array
        // });

    } catch (error) {
        console.error('Photo deletion error:', error);
        res.status(500).json({ message: error.message || 'Failed to process photo deletion.' });
    }
};