// server/models/Agency.js
const BaseUser = require('./BaseUser');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Discriminator Schema for all users classified as 'Agency'.
 * This schema inherits core fields from BaseUser and adds fields for 
 * dynamic configuration and Agency-specific data (e.g., company name).
 */
const agencySchema = new Schema({
    // --- 1. Dynamic Type Slug (Links to UserTypeConfig if multiple agency types exist) ---
    // We include this to match the structure of Collaborator/future dynamic agency types.
    agencyType: {
        type: String, // Stores the slug from UserTypeConfig (e.g., 'brand-agency')
        required: true, 
        index: true
    },
    
    // --- 2. The Dynamic/Polymorphic Data Container ---
    // Stores custom, flexible attributes defined by the admin for Agency types.
    groupSpecificAttributes: {
        type: Schema.Types.Mixed, // Allows storage of any data structure
        default: {}
    },
    
    // NOTE: Specific Agency fields that are always needed (e.g., tax ID) could be added here.
    companyName: { type: String, required: true },
    contactRole: { type: String }, // Role of the primary contact person
});

// Register this schema as a discriminator of the BaseUser model
const Agency = BaseUser.discriminator('Agency', agencySchema);
module.exports = Agency;