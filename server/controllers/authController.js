const BaseUser = require('../models/BaseUser');
const Collaborator = require('../models/Collaborator');
const Agency = require('../models/Agency');
const Token = require("../models/Token");
const LinkVidsAdmin = require('../models/LinkVidsAdmin');

const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { sendEmail } = require('../services/emailService');
const welcomeEmail = require('../templates/email/welcomeEmail');
const resetPasswordEmail = require("../templates/email/resetPasswordEmail");

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

            foundUser.lastLogin = Date.now();
            await foundUser.save({ validateBeforeSave: false });

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
            lastLogin: Date.now(),
            collaboratorType: collaboratorType, // e.g., 'ugc-creator'
            groupSpecificAttributes: otherData // Store dynamic fields here
        });

        // const loginUrl = `${process.env.CLIENT_URL}/login`;
        // const emailHtml = welcomeEmail(newUser.name, loginUrl);

        // try {
        //     await sendEmail({
        //         to: newUser.email,
        //         subject: "Welcome to LinkVids!",
        //         html: emailHtml
        //     });
        // } catch (error) {
        //     console.error("Email failed:", error);
        // }

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
            lastLogin: Date.now(),
            agencyType: 'standard-agency', // Default or dynamic if needed
            companyName: companyName,
            groupSpecificAttributes: otherData
        });

        res.status(201).json({ success: true, message: 'Agency registered successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// @desc    Request Password Reset
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Security: Don't reveal if user exists. 
      // Always return success message or a generic error.
      return res.status(200).json({ message: "If that email exists, a link has been sent." });
    }

    // Check if token already exists for this user and delete it (optional cleanup)
    let token = await Token.findOne({ userId: user._id });
    if (token) await token.deleteOne();

    // Generate specific reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, 10);

    // Save token to DB
    await new Token({
      userId: user._id,
      token: hash,
      createdAt: Date.now(),
    }).save();

    // Construct Link
    // Construct Link
    const link = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&id=${user._id}`;

    // Generate HTML using your template
    const emailHtml = resetPasswordEmail(user.username, link);

    // Send Email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: emailHtml
  });

    res.status(200).json({ message: "If that email exists, a link has been sent." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { userId, token, password } = req.body;

    const passwordResetToken = await Token.findOne({ userId });

    if (!passwordResetToken) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    const isValid = await bcrypt.compare(token, passwordResetToken.token);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update User
    await User.findByIdAndUpdate(userId, { 
        $set: { password: hashedPassword } 
    }, { new: true });

    // Delete used token
    await passwordResetToken.deleteOne();

    // Optional: Send success email
    const user = await User.findById(userId);
    await sendEmail({
        to: user.email, 
        subject: "Password Changed Successfully", 
        html: "You have successfully reset your password."
    });

    res.status(200).json({ message: "Password reset successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
    handleLogin,
    registerAgency,
    registerCollaborator,
    forgotPassword,
    resetPassword
};