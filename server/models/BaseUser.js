// server/models/BaseUser.js (Revised to include core identity fields for Collaborators/Agencies)
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');
const financialProfileSchema = require('./FinancialProfile');

const baseUserSchema = new Schema({
    // ----------------------------------------------------
    // --- 1. DISCRIMINATOR & AUTHENTICATION FIELDS ---
    // ----------------------------------------------------
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false 
    },
    userType: { // Discriminator Key
        type: String,
        required: true,
        enum: ['Collaborator', 'Agency', 'LinkVidsAdmin'],
        index: true
    },

    isActive: {
        type: Boolean,
        default: true
    },

    permissions: {
        jobs: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        collaborators: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        admins: { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        news: { type: String, enum: ['none', 'view', 'edit'], default: 'edit' }
    },

    profile_picture: { 
        type: String,
        default: '' // Can hold URL or relative path (e.g., '/uploads/avatar-123.jpg')
    },

    // ----------------------------------------------------
    // --- 2. CORE IDENTITY & CONTACT FIELDS (Critical for Imports/Querying) ---
    // ----------------------------------------------------
    
    // We break 'name' into two parts as per the CSV data
    first_name: { type: String }, // Now derived from CSV 'First Name'
    last_name: { type: String },  // Now derived from CSV 'Last Name'
    
    // Fallback/Legacy Name (original 'name' field)
    name: { 
        type: String, 
        required: true 
    }, 
    
    // Primary Contact and Location fields used by most users
    phone: { type: String },
    city: { type: String },
    country: { type: String },
    address: { type: String },
    zipCode: { type: String },
    
    // --- Security & Tokens ---
    refreshToken: { type: String, select: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // --- Social Login Fields ---
    socialLogin: { type: Boolean, default: false },
    googleUserId: String,
    appleUserId: String,

    financial_profile: {
        type: financialProfileSchema,
        default: null
    },
    
},
{
  timestamps: true,
  discriminatorKey: 'userType' 
});

// --- Methods ---
baseUserSchema.methods.generatePasswordReset = function() {
    this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000;
};

const BaseUser = mongoose.model('User', baseUserSchema);
module.exports = BaseUser;