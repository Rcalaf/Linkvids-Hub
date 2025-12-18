// server/models/UserTypeConfig.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userTypeConfigSchema = new Schema({
    // Unique key (e.g., 'ugc-creator', 'drone-pilot')
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
    },
    // Parent Discriminator Type ('Collaborator' or 'Agency')
    parentType: {
        type: String,
        required: true,
        enum: ['Collaborator', 'Agency'], 
    },
    // Array of fields defining the form schema
    fields: [{
        // Links to the AttributeDefinition slug
        attributeSlug: {
            type: String,
            required: true
        },
        label: { // Specific label for this user type
            type: String,
            required: true
        },
        required: {
            type: Boolean,
            default: false
        },
        section: String, 
    }],
});

module.exports = mongoose.model('UserTypeConfig', userTypeConfigSchema);