// server/routes/newsRoutes.js
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const verifyJWT = require('../middleware/verifyJWT');
const verifyRoles = require('../middleware/verifyRoles');
const verifyPermissions = require('../middleware/verifyPermissions');

// 1. PUBLIC / USER ROUTES (Read Only)
// Accessible by anyone logged in (Collaborators, Agencies, Admins)
router.use(verifyJWT);
router.get('/feed',  newsController.getNewsFeed);


// 2. ADMIN MANAGEMENT ROUTES

//router.use(verifyRoles('LinkVidsAdmin')); // Must be admin

// Get Admin List (Drafts included)
router.get('/all',verifyRoles('LinkVidsAdmin'), verifyPermissions('news', 'view'), newsController.getAllNewsAdmin);
// Create / Edit / Delete
router.post('/', verifyRoles('LinkVidsAdmin'), verifyPermissions('news', 'edit'), newsController.createNews);
router.get('/:id',  newsController.getNewsById);
router.put('/:id',verifyRoles('LinkVidsAdmin'),  verifyPermissions('news', 'edit'), newsController.updateNews);
router.delete('/:id', verifyRoles('LinkVidsAdmin'), verifyPermissions('news', 'edit'), newsController.deleteNews);

module.exports = router;