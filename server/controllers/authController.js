const BaseUser = require('../models/BaseUser');
const Collaborator = require('../models/Collaborator');
const Agency = require('../models/Agency');
const LinkVidsAdmin = require('../models/LinkVidsAdmin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. LOGIN LOGIC (Unified)
const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    try {
        // Find user in the base collection (covers all types)
        const foundUser = await BaseUser.findOne({ email: email.toLowerCase() }).select('+password').exec();
        if (!foundUser) return res.sendStatus(401); // Unauthorized

      
        const match = await bcrypt.compare(password, foundUser.password);
        if (match) {
            // Generate Access Token
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "userId": foundUser._id,
                        "email": foundUser.email,
                        "userType": foundUser.userType,
                        // For collaborators, include the subtype for frontend routing
                        "collaboratorType": foundUser.collaboratorType || null
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '7d' } // Adjust as needed
            );

            // Determine Redirect Path (Helper for frontend)
            let redirectPath = '/dashboard'; // Default fallback
            if (foundUser.userType === 'LinkVidsAdmin') redirectPath = '/admin';
            else if (foundUser.userType === 'Agency') redirectPath = '/agency/dashboard';
            else if (foundUser.userType === 'Collaborator') redirectPath = '/creator';

            // Return safe user object
            const userResponse = foundUser.toObject();
            delete userResponse.password;

            res.json({ 
                success: true, 
                accessToken, 
                redirectPath,
                user: userResponse 
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login failed.' });
    }
};

// 2. REGISTER COLLABORATOR
const registerCollaborator = async (req, res) => {
    const { email, password, firstName, lastName, collaboratorType, ...otherData } = req.body;

    if (!email || !password || !firstName || !lastName || !collaboratorType) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const duplicate = await BaseUser.findOne({ email: email.toLowerCase() }).exec();
    if (duplicate) return res.status(409).json({ message: 'Email already in use.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create specific Collaborator document
        const newCollaborator = await Collaborator.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            name: `${firstName} ${lastName}`, // Composite name
            userType: 'Collaborator',
            collaboratorType: collaboratorType, // e.g., 'ugc-creator'
            groupSpecificAttributes: otherData // Store dynamic fields here
        });

        res.status(201).json({ success: true, message: `Collaborator (${collaboratorType}) registered!` });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// 3. REGISTER AGENCY
const registerAgency = async (req, res) => {
    const { email, password, companyName, firstName, lastName, ...otherData } = req.body;

    if (!email || !password || !companyName) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const duplicate = await BaseUser.findOne({ email: email.toLowerCase() }).exec();
    if (duplicate) return res.status(409).json({ message: 'Email already in use.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAgency = await Agency.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            name: companyName, // Agencies often use company name as display name
            userType: 'Agency',
            agencyType: 'standard-agency', // Default or dynamic if needed
            companyName: companyName,
            groupSpecificAttributes: otherData
        });

        res.status(201).json({ success: true, message: 'Agency registered successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

module.exports = {
    handleLogin,
    registerAgency,
    registerCollaborator,
};