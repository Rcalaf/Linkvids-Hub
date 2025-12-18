// server/controllers/attributesController.js
// NOTE: I'm using the name 'AttributeDefinition' in the controller body 
// to match the original model file name, assuming the import path is correct.
const AttributeDefinition = require('../models/Attributes'); 
const UserTypeConfig = require('../models/UserTypeConfig'); 

// ------------------------------------------------------------------
// --- GET (READ) all attributes ------------------------------------
// ------------------------------------------------------------------
const getAllAttributes = async (req, res) => {
    try {
        const attributes = await AttributeDefinition.find().lean();
        res.json(attributes);
    } catch (err) {
        console.error('Error in getAllAttributes:', err);
        res.status(500).json({ message: 'Error retrieving attributes.', error: err.message });
    }
};

// ------------------------------------------------------------------
// --- POST (CREATE) new attribute ----------------------------------
// ------------------------------------------------------------------
const createNewAttribute = async (req, res) => {
    const { slug, name, fieldType, defaultOptions, description } = req.body;
    
    if (!slug || !name || !fieldType) {
        return res.status(400).json({ message: 'Slug, name, and fieldType are required.' });
    }
    
    const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-');

    try {
        const duplicate = await AttributeDefinition.findOne({ slug: formattedSlug }).exec();
        if (duplicate) {
            return res.status(409).json({ message: `Attribute with slug '${formattedSlug}' already exists.` });
        }

        // 🚨 FIX: Ensure defaultOptions is an array for Mongoose 🚨
        // The frontend utility 'processAttributeFormData' should send an array.
        // We use a safe check to ensure it's not undefined/null if a value isn't expected.
        const finalOptions = Array.isArray(defaultOptions) ? defaultOptions : [];

        const newAttribute = await AttributeDefinition.create({
            slug: formattedSlug,
            name,
            fieldType,
            defaultOptions: finalOptions, // Pass the guaranteed array
            description
        });
        
        res.status(201).json(newAttribute);
    } catch (err) {
        // Log the detailed error on the server for debugging 
        console.error('Mongoose Create Attribute Error:', err); 
        res.status(500).json({ message: 'Error creating attribute: Database validation failed.', error: err.message });
    }
};

// ------------------------------------------------------------------
// --- PUT (UPDATE) existing attribute ------------------------------
// ------------------------------------------------------------------
const updateAttribute = async (req, res) => {
    const { slug } = req.params;
    const { name, fieldType, defaultOptions, description } = req.body;

    if (!name || !fieldType) {
        return res.status(400).json({ message: 'Name and fieldType are required for update.' });
    }
    
    try {
        // 🚨 FIX: Ensure defaultOptions is an array for Mongoose during update 🚨
        const finalOptions = Array.isArray(defaultOptions) ? defaultOptions : [];

        const attribute = await AttributeDefinition.findOneAndUpdate(
            { slug },
            { name, fieldType, defaultOptions: finalOptions, description }, // Use the guaranteed array
            { new: true, runValidators: true }
        ).exec();

        if (!attribute) {
            return res.status(404).json({ message: 'Attribute not found.' });
        }
        res.json(attribute);
    } catch (err) {
        console.error('Mongoose Update Attribute Error:', err);
        res.status(500).json({ message: 'Error updating attribute: Database validation failed.', error: err.message });
    }
};

// ------------------------------------------------------------------
// --- DELETE existing attribute ------------------------------------
// ------------------------------------------------------------------
const deleteAttribute = async (req, res) => {
    const { slug } = req.params;

    // CRUCIAL: Check if attribute is used by any user type configuration
    const usage = await UserTypeConfig.findOne({ 'fields.attributeSlug': slug }).exec();

    if (usage) {
        return res.status(409).json({ message: `Cannot delete attribute. It is currently used in the '${usage.name}' user configuration.` });
    }

    try {
        const result = await AttributeDefinition.deleteOne({ slug }).exec();
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Attribute not found.' });
        }
        res.json({ message: `Attribute '${slug}' deleted successfully.` });
    } catch (err) {
        console.error('Mongoose Delete Attribute Error:', err);
        res.status(500).json({ message: 'Error deleting attribute.', error: err.message });
    }
};

module.exports = {
    getAllAttributes,
    createNewAttribute,
    updateAttribute,
    deleteAttribute,
};