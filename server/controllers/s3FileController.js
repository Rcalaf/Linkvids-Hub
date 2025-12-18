// server/controllers/fileController.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const Collaborator = require('../models/Collaborator'); 
const mongoose = require('mongoose');
const path = require('path');

// --- 1. CONFIGURATION ---
const s3Client = new S3Client({
    region: process.env.OVH_REGION,
    endpoint: process.env.OVH_ENDPOINT,
    credentials: {
        accessKeyId: process.env.OVH_ACCESS_KEY,
        secretAccessKey: process.env.OVH_SECRET_KEY
    }
});

const BUCKET_NAME = process.env.OVH_BUCKET_NAME;

// --- 2. HELPER: Upload to S3 ---
const uploadToS3 = async (file, userId) => {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, fileExtension).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${Date.now()}-${cleanName}${fileExtension}`;
    
    // 🚨 LOGIC: Determine subfolder based on file type
    let subFolder = 'files'; // Default
    if (file.mimetype.startsWith('image/')) {
        subFolder = 'images';
    }

    // 🚨 LOGIC: Construct Key: uploads/{userId}/{images|files}/{filename}
    const key = `uploads/${userId}/${subFolder}/${fileName}`; 

    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read'
            },
        });

        await upload.done();

        // Construct Virtual-Hosted URL
        const endpointHost = process.env.OVH_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const publicUrl = `https://${BUCKET_NAME}.${endpointHost}/${key}`;
        
        return {
            path: publicUrl,
            name: file.originalname
        };
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error('Failed to upload file to S3');
    }
};

// --- 3. HELPER: Delete from S3 ---
const deleteFromS3 = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        let key = '';
        
        if (fileUrl.includes(`/${BUCKET_NAME}/`)) {
            // Path style fallback
            key = fileUrl.split(`/${BUCKET_NAME}/`)[1];
        } else {
            // Virtual-host style
            const endpointHost = process.env.OVH_ENDPOINT.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const parts = fileUrl.split(endpointHost);
            if (parts.length > 1) {
                key = parts[1].replace(/^\//, '');
            }
        }

        if (!key) return;

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`Deleted S3 Object: ${key}`);
    } catch (error) {
        console.error(`S3 Deletion Error:`, error);
    }
};

// --- POST: Handle Upload ---
exports.handlePhotoUpload = async (req, res) => {
    const { userId } = req.params; 
    const { attributeSlug } = req.body; 

    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded.' });
    if (!attributeSlug || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid request.' });

    try {
        const user = await Collaborator.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // 1. Upload to S3 (Parallel)
        const uploadPromises = req.files.map(file => uploadToS3(file, userId));
        const s3Results = await Promise.all(uploadPromises);

        // 2. Prepare DB Objects
        const newPhotoObjects = s3Results.map(s3File => ({
            path: s3File.path, 
            uploadedAt: new Date(),
            name: s3File.name
        }));

        // 3. Save to DB
        if (attributeSlug === 'profile_picture') {
            if (user.profile_picture) {
                await deleteFromS3(user.profile_picture);
            }
            user.profile_picture = newPhotoObjects[0].path;
            await user.save();
            return res.json({ message: 'Profile picture updated!', photos: [{ path: user.profile_picture }] });
        }

        const existingArray = user.groupSpecificAttributes[attributeSlug] || [];
        user.groupSpecificAttributes[attributeSlug] = [...existingArray, ...newPhotoObjects];
        user.markModified('groupSpecificAttributes');
        await user.save();

        res.json({ message: 'Files uploaded!', photos: user.groupSpecificAttributes[attributeSlug] });

    } catch (error) {
        console.error('Upload Process Error:', error);
        res.status(500).json({ message: 'Failed to process upload.' });
    }
};

// --- DELETE: Handle Deletion ---
exports.handlePhotoDeletion = async (req, res) => {
    const { userId } = req.params;
    const { attributeSlug, photoPath } = req.body; 

    if (!attributeSlug || !photoPath || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid params.' });

    try {
        const user = await Collaborator.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // 1. Delete from S3
        await deleteFromS3(photoPath);

        // 2. Remove from DB
        if (attributeSlug === 'profile_picture') {
            user.profile_picture = null;
            await user.save();
            return res.json({ message: 'Profile picture removed!', photos: [] });
        } else {
            const existingArray = user.groupSpecificAttributes[attributeSlug] || [];
            user.groupSpecificAttributes[attributeSlug] = existingArray.filter(p => p.path !== photoPath);
            user.markModified('groupSpecificAttributes');
            await user.save();
            return res.json({ message: 'File deleted!', photos: user.groupSpecificAttributes[attributeSlug] });
        }

    } catch (error) {
        console.error('Deletion Process Error:', error);
        res.status(500).json({ message: 'Failed to delete file.' });
    }
};