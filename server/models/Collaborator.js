// server/models/Collaborator.js
const BaseUser = require('./BaseUser');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Discriminator Schema for all users classified as 'Collaborator'.
 * This schema inherits fields from BaseUser and adds fields necessary 
 * for the dynamic attribute system.
 */
const collaboratorSchema = new Schema({
    // --- 1. Dynamic Type Slug (Links to UserTypeConfig) ---
    collaboratorType: {
        type: String, // Stores the slug (e.g., 'ugc-creator', 'freelancer-outsource')
        required: true, 
        index: true
    },
    
    // --- 2. Polymorphic Data Container ---
    // Stores all custom attributes (e.g., height, rate_range, tiktok, etc.)
    // that are defined in the UserTypeConfig model's 'fields' array.
    groupSpecificAttributes: {
        type: Schema.Types.Mixed, // Allows storage of any data structure
        default: {}
    },
    
    // NOTE: All core fields (email, first_name, phone, etc.) are inherited from BaseUser.js
});

// Register this schema as a discriminator of the BaseUser model, using the key 'Collaborator'
const Collaborator = BaseUser.discriminator('Collaborator', collaboratorSchema);
module.exports = Collaborator;