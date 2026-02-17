// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.handleLogin);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

router.get('/profile',verifyJWT, authController.getUserProfile);

// POST /api/auth/register/collaborator
router.post('/register/collaborator', authController.registerCollaborator);

// POST /api/auth/register/agency
router.post('/register/agency', authController.registerAgency);

// Optional: Logout route (usually just clears cookie/token on client, but good to have)
//router.post('/logout', authController.handleLogout); 




module.exports = router;