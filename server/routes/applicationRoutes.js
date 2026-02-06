// server/routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobControllers');
const verifyJWT = require('../middleware/verifyJWT');
const verifyPermissions = require('../middleware/verifyPermissions');
const verifyRoles = require('../middleware/verifyRoles');

// Protect all job routes
router.use(verifyJWT);
//router.use(verifyRoles('LinkVidsAdmin','Collaborator'));

// Routes
router.route('/')
    .get(verifyRoles('LinkVidsAdmin'), jobController.getAllApplications)
   

module.exports = router;