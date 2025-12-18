// server/models/AttributeDefinition.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attributeDefinitionSchema = new Schema({
    // Unique key used for storage in the DB and mapping on the frontend
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Friendly name displayed to the Admin
    name: {
        type: String,
        required: true,
    },
    // The type of form input/data validation (must match frontend/backend logic)
    fieldType: {
        type: String,
        required: true,
        enum: ['text', 'number', 'date', 'boolean', 'array', 'select', 'url', 'mixed', 'image_array'],
    },
    // Optional: Default options for 'select' or 'array' types
    //defaultOptions: [String], 
    defaultOptions: {
        type: Schema.Types.Mixed, 
        default: []
    },
    // Optional: Placeholder or hint text
    description: String,
});

module.exports = mongoose.model('Attributes', attributeDefinitionSchema);