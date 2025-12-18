// server/controllers/userTypeController.js
const UserTypeConfig = require('../models/UserTypeConfig');
const AttributeDefinition = require('../models/Attributes');
const BaseUser = require('../models/BaseUser');

// GET /api/admin/user-types
const getAllUserTypes = async (req, res) => {
    try {
        const userTypes = await UserTypeConfig.find().lean();
        const attributes = await AttributeDefinition.find().lean();
        const attributeMap = new Map(attributes.map(attr => [attr.slug, attr])); // Map: {'slug': {fieldType: 'text', ...}}

        // 2. Enrich/Populate User Types with attribute details
        const enhancedUserTypes = userTypes.map(userType => ({
            ...userType,
            // 🚨 FIX: Filter out only the broken fields, keep the rest 🚨
            fields: userType.fields.map(field => {
                const details = attributeMap.get(field.attributeSlug);
                if (!details) {
                     //console.warn(`⚠️ Missing attribute definition for slug '${field.attributeSlug}' in User Type '${userType.slug}'`);
                     return null; // Mark as bad field
                }
                return {
                    ...field,
                    attributeDetails: details 
                };
            }).filter(field => field !== null) // Remove the bad fields from the array
        }));
        
        // Filter any configurations where attributes are missing
        // const usableUserTypes = enhancedUserTypes.filter(type => 
        //      type.fields.every(field => field.attributeDetails !== null)
        // );

        
        res.json(enhancedUserTypes);
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Error retrieving user types.', error: err.message });
    }
};

// POST /api/admin/user-types
const createNewUserType = async (req, res) => {
    const { slug, name, parentType, fields } = req.body;

    if (!slug || !name || !parentType || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: 'Slug, name, parentType, and at least one field are required.' });
    }

    const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-');

    // 1. Check for duplicate slug
    const duplicate = await UserTypeConfig.findOne({ slug: formattedSlug }).exec();
    if (duplicate) {
        return res.status(409).json({ message: `User type with slug '${formattedSlug}' already exists.` });
    }

    // 2. Validate all referenced attribute slugs
    const requiredSlugs = fields.map(f => f.attributeSlug);
    const existingAttributes = await AttributeDefinition.find({ slug: { $in: requiredSlugs } }).lean();
    
    if (existingAttributes.length !== requiredSlugs.length) {
        // Find the missing slugs to return a helpful error
        const existingSlugs = new Set(existingAttributes.map(a => a.slug));
        const missingSlugs = requiredSlugs.filter(slug => !existingSlugs.has(slug));
        return res.status(400).json({ message: `Validation failed: One or more referenced attributes do not exist: ${missingSlugs.join(', ')}` });
    }

    // 3. Perform data embedding (Denormalization)
    const attributeMap = new Map(existingAttributes.map(attr => [attr.slug, attr]));
    
    const enrichedFields = fields.map(field => {
        const details = attributeMap.get(field.attributeSlug);
        
        return {
            ...field,
            // Embed the critical fields from AttributeDefinition into the UserTypeConfig
            fieldType: details.fieldType,
            defaultOptions: details.defaultOptions,
            description: details.description || null,
        };
    });

    try {
        const newUserType = await UserTypeConfig.create({
            slug: formattedSlug,
            name,
            parentType,
            fields: enrichedFields // Save the enriched, denormalized fields
        });
        res.status(201).json(newUserType);
    } catch (err) {
        res.status(500).json({ message: 'Error creating user type.', error: err.message });
    }
};

// PUT /api/admin/user-types/:slug
const updateUserType = async (req, res) => {
    const { slug } = req.params;
    const { name, parentType, fields } = req.body;
    
    // 1. Basic validation
    if (!name || !parentType || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ message: 'Name, parentType, and fields array with at least one item are required for update.' });
    }

    // 2. Validate all referenced attribute slugs exist (Simplified check)
    const requiredSlugs = fields.map(f => f.attributeSlug);
    const existingAttributes = await AttributeDefinition.find({ slug: { $in: requiredSlugs } }).lean();
    
    if (existingAttributes.length !== requiredSlugs.length) {
        const existingSlugs = new Set(existingAttributes.map(a => a.slug));
        const missingSlugs = requiredSlugs.filter(s => !existingSlugs.has(s));
        return res.status(400).json({ message: `Validation failed: Referenced attributes missing: ${missingSlugs.join(', ')}` });
    }

    // 3. Perform data embedding (Denormalization) for the update payload
    const attributeMap = new Map(existingAttributes.map(attr => [attr.slug, attr]));
    
    const enrichedFields = fields.map(field => {
        const details = attributeMap.get(field.attributeSlug);
        
        return {
            ...field,
            // Embed the critical fields from AttributeDefinition
            fieldType: details.fieldType,
            defaultOptions: details.defaultOptions,
            description: details.description || null,
        };
    });

    try {
        const updatedUserType = await UserTypeConfig.findOneAndUpdate(
            { slug },
            { name, parentType, fields: enrichedFields },
            { new: true, runValidators: true } // Returns the updated document and runs schema validation
        ).exec();

        if (!updatedUserType) {
            return res.status(404).json({ message: `User type with slug '${slug}' not found.` });
        }
        res.json(updatedUserType);
    } catch (err) {
        res.status(500).json({ message: 'Error updating user type.', error: err.message });
    }
};

// DELETE /api/admin/user-types/:slug
const deleteUserType = async (req, res) => {
    const { slug } = req.params;
    
    // 1. Check if the configuration exists
    const config = await UserTypeConfig.findOne({ slug }).exec();
    if (!config) {
        return res.status(404).json({ message: `User type with slug '${slug}' not found.` });
    }

    // 2. CRITICAL INTEGRITY CHECK: Check if any user is currently referencing this configuration.
    // The field to check depends on the parentType (Collaborator uses collaboratorType, Agency uses agencyType if we defined one).
    const checkField = config.parentType === 'Collaborator' ? 'collaboratorType' : 'agencyType';
    
    // We search the main 'users' collection (via BaseUser) for any documents where the type matches the slug.
    const userInUse = await BaseUser.findOne({ [checkField]: slug }).exec();

    if (userInUse) {
        // Return 409 Conflict if the type is still assigned to a user
        return res.status(409).json({ message: `Cannot delete: The user type '${config.name}' is currently assigned to a user and cannot be removed.` });
    }
    
    // 3. Delete the configuration
    try {
        await UserTypeConfig.deleteOne({ slug }).exec();
        res.json({ message: `User type '${slug}' deleted successfully.` });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user type.', error: err.message });
    }
};

module.exports = {
    getAllUserTypes,
    createNewUserType,
    updateUserType,
    deleteUserType,
};