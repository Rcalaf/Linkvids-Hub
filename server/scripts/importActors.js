// server/scripts/importActors.js

const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
require('dotenv').config({ path: './.env' }); 

// --- CONFIGURATION ---
const CSV_FILE_PATH = 'scripts/actors.csv'; 
const TEMP_PASSWORD = 'WelcomeActor123!'; 
const ACTOR_SLUG = 'actor';
const BCRYPT_SALT_ROUNDS = 10;

// --- Mongoose Model Imports ---
const Collaborator = require('../models/Collaborator'); 
const BaseUser = require('../models/BaseUser');       

// --- MAPPING DEFINITIONS ---
const CSV_TO_SLUG_MAP = {
    // Base User Fields
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Email': 'email',
    'Phone': 'phone',
    'Adress': 'address', // Note the CSV spelling
    'City': 'city',
    'Country': 'country',

    // Dynamic Attributes
    'Gender': 'gender',
    'Nationality': 'nationality',
    'Year of birth': 'year_of_birth',
    'Native Language': 'native_language',
    'Other Languages': 'other_languages',
    'Comments': 'comments',
    'Instagram': 'instagram',
    'TikTok': 'tiktok', // Note: CSV Header says 'Tiktok' (lowercase t), check logic below
    'Tiktok': 'tiktok', // Handle casing
    'Portfolio link': 'portfolio_link',
    'Website': 'website',
    'Other links': 'other_links',
    'Photos': 'portfolio_gallery', // 🚨 Special handling for image array
    'Rate Range': 'rate_range',
    'Motivation': 'motivation',
    'Self Worker': 'self_worker',
    'Eyes Color': 'eyes_color',
    'Hair Color': 'hair_color',
    'Hair Type': 'hair_type',
    'Skin color': 'skin_color', // Handle casing
    'Skin Color': 'skin_color',
    'Height': 'height',
    'T-shirt size': 'tshirt_size',
    'Jean size': 'jean_size',
    'Shoe size': 'shoe_size',
    'Voice Over': 'voice_over',
    'Source': 'source',
    'Worked with Linkvids': 'worked_with_linkvids',
    'Are you able to work in Barcelona ?': 'work_in_bcn',
    'Driver Licence': 'driving_license',
    'Vehicle': 'vehicle',
    'Equipment': 'equipment',
    'Traits': 'traits'
};

const BASE_USER_FIELDS = new Set(['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'country']);

// Helper to clean boolean strings from CSV
const parseBoolean = (val) => {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return ['yes', 'true', 'done', 'worked with us', 'available'].includes(v);
};

async function importActors() {
    console.log(`\nStarting CSV import for Actors (Slug: ${ACTOR_SLUG})...`);

    let successfulInserts = 0;
    let duplicateErrors = 0;

    try {
        await mongoose.connect(process.env.DATABASE_URI);
        console.log('MongoDB Connected.');

        const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_SALT_ROUNDS);
        const usersToProcess = [];
        const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv());

        for await (const row of stream) {
            const baseUserPayload = {};
            const groupSpecificAttributes = {};
            let hasEmail = false;

            for (const header in row) {
                // Normalize header key to handle potential extra spaces or casing
                const cleanHeader = header.trim(); 
                const slug = CSV_TO_SLUG_MAP[cleanHeader];
                const value = row[header] ? row[header].trim() : '';

                if (!slug || !value) continue;

                if (slug === 'email') {
                    baseUserPayload[slug] = value.toLowerCase();
                    hasEmail = true;
                } 
                else if (BASE_USER_FIELDS.has(slug)) {
                    baseUserPayload[slug] = value;
                } 
                else {
                    // 🚨 SPECIAL TRANSFORMATIONS 🚨
                    
                    // 1. Handle Photos (String -> Object Array)
                    if (slug === 'portfolio_gallery') {
                        // Split by comma, clean paths
                        const rawPaths = value.split(',');
                        groupSpecificAttributes[slug] = rawPaths.map(p => ({
                            path: p.trim(),
                            uploadedAt: new Date(),
                            name: p.trim().split('/').pop() // Extract filename
                        })).filter(p => p.path); // Remove empty entries
                    }
                    // 2. Handle Array Fields (Languages)
                    else if (['native_language', 'other_languages', 'driving_license'].includes(slug)) {
                        groupSpecificAttributes[slug] = value.split(',').map(s => s.trim());
                    }
                    // 3. Handle Booleans
                    else if (['worked_with_linkvids', 'work_in_bcn', 'self_worker', 'voice_over', 'vehicle', 'equipment'].includes(slug)) {
                        groupSpecificAttributes[slug] = parseBoolean(value);
                    }
                    // 4. Standard Strings/Numbers
                    else {
                        groupSpecificAttributes[slug] = value;
                    }
                }
            }

            if (!hasEmail) continue;

            // Composite Name
            const firstName = baseUserPayload.first_name || '';
            const lastName = baseUserPayload.last_name || '';
            let compositeName = `${firstName} ${lastName}`.trim();
            if (!compositeName) compositeName = baseUserPayload.email;

            usersToProcess.push({
                ...baseUserPayload,
                name: compositeName,
                password: hashedPassword,
                userType: 'Collaborator',
                collaboratorType: ACTOR_SLUG,
                groupSpecificAttributes: groupSpecificAttributes,
            });
        }

        // Filter Duplicates
        const emails = usersToProcess.map(u => u.email);
        const existingUsers = await Collaborator.find({ email: { $in: emails } }, { email: 1 }).exec();
        const existingEmails = new Set(existingUsers.map(u => u.email));
        const newUsers = usersToProcess.filter(u => !existingEmails.has(u.email));

        console.log(`\nFound ${usersToProcess.length} rows. Inserting ${newUsers.length} new users...`);

        // Insert
        for (const userPayload of newUsers) {
            try {
                await Collaborator.create(userPayload);
                successfulInserts++;
            } catch (error) {
                if (error.code === 11000) {
                    duplicateErrors++;
                    console.warn(`Duplicate Email skipped: ${userPayload.email}`);
                } else {
                    console.error(`Error saving ${userPayload.email}:`, error.message);
                }
            }
        }
        
        console.log(`\n✅ Import Complete. Imported: ${successfulInserts}. Skipped Duplicates: ${duplicateErrors + existingEmails.size}`);

    } catch (error) {
        console.error('\n❌ IMPORT ERROR:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

importActors();