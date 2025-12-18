// server/scripts/importOutsource.js

const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
// Load .env file from the parent directory (server/)
require('dotenv').config({ path: '../.env' }); 

// --- CONFIGURATION ---
const CSV_FILE_PATH = './outsource.csv'; 
const TEMP_PASSWORD = 'WelcomeFreelancer123!'; 
const OUTSOURCE_SLUG = 'freelancer-outsource';
const BCRYPT_SALT_ROUNDS = 10;

// --- Mongoose Model Imports ---
const Collaborator = require('../models/Collaborator'); 
const BaseUser = require('../models/BaseUser');       

// --- MAPPING DEFINITIONS ---
const CSV_TO_SLUG_MAP = {
    // Base User Fields
    'First name': 'first_name',
    'Last Name': 'last_name',
    'Email': 'email',
    'Phone': 'phone',
    'Adress': 'address',
    'City': 'city',
    'Country': 'country',

    // Dynamic Attributes
    'Areas': 'areas', // Array
    'Gender': 'gender',
    'Nationality': 'nationality',
    'Year of Birth': 'year_of_birth',
    'Native Language': 'native_language',
    'Other Languages': 'other_languages',
    'Languages': 'other_languages', // Fallback mapping
    'Comments': 'admin_comments', // Mapped to admin_comments per your schema
    'Instagram': 'instagram',
    'Tiktok': 'tiktok',
    'Portfolio link': 'portfolio_link', // Note: CSV doesn't explicitly list this but good to map if present
    'Website': 'website',
    'Photos': 'portfolio_gallery', // Image Array
    'Rate Range': 'rate_range',
    'Motivation': 'motivation',
    'Self Worker': 'self_worker', // Boolean
    'Source': 'source',
    'Worked with Linkvids': 'worked_with_linkvids',
    'Driver Licence': 'driving_license', // Array
    'Vehicle': 'vehicle', // Boolean
    'Equipment': 'equipment', // Boolean (mapped from text description)
    'Prefered': 'preferred_platform' 
};

const BASE_USER_FIELDS = new Set(['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'country']);

// Helper to clean boolean strings
const parseBoolean = (val) => {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    return ['yes', 'true', 'done', 'worked with us', 'available'].includes(v);
};

async function importOutsource() {
    console.log(`\nStarting CSV import for Freelancer/Outsource (Slug: ${OUTSOURCE_SLUG})...`);

    let successfulInserts = 0;
    let duplicateErrors = 0;
    let preCheckSkipped = 0;

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

            // Generate a fake email if missing (common in older outsource lists without direct contact info)
            // Format: firstname.lastname.placeholder@linkvids.com
            if (!row['Email']) {
                const fname = (row['First name'] || '').toLowerCase().replace(/\s/g, '');
                const lname = (row['Last Name'] || '').toLowerCase().replace(/\s/g, '');
                if (fname || lname) {
                    row['Email'] = `${fname}.${lname}.placeholder@linkvids.com`;
                    // console.warn(`Generated placeholder email for ${row['Full Name']}: ${row['Email']}`);
                }
            }

            for (const header in row) {
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
                    
                    // 1. Areas / Categories / License (Comma separated -> Array)
                    if (slug === 'areas' || slug === 'categories' || slug === 'driving_license' || slug === 'other_languages') {
                        groupSpecificAttributes[slug] = value.split(',').map(s => s.trim());
                    }
                    // 2. Photos (String -> Object Array)
                    else if (slug === 'portfolio_gallery') {
                        const rawPaths = value.split(',');
                        groupSpecificAttributes[slug] = rawPaths.map(p => ({
                            path: p.trim(),
                            uploadedAt: new Date(),
                            name: p.trim().split('/').pop()
                        })).filter(p => p.path);
                    }
                    // 3. Booleans
                    else if (['self_worker', 'vehicle', 'worked_with_linkvids', 'voice_over'].includes(slug)) {
                        groupSpecificAttributes[slug] = parseBoolean(value);
                    }
                    // 4. Equipment (Schema says Boolean, CSV has text description)
                    // Strategy: If there is text, set boolean to true.
                    else if (slug === 'equipment') {
                         groupSpecificAttributes[slug] = true; 
                         // Optional: If you added an 'equipment_details' field to schema, you could save the text there.
                    }
                    // 5. Standard Strings
                    else {
                        groupSpecificAttributes[slug] = value;
                    }
                }
            }

            if (!hasEmail) continue;

            // Name Composition
            const firstName = baseUserPayload.first_name || '';
            const lastName = baseUserPayload.last_name || '';
            let compositeName = `${firstName} ${lastName}`.trim();
            if (!compositeName) compositeName = row['Full Name'] || baseUserPayload.email;

            usersToProcess.push({
                ...baseUserPayload,
                name: compositeName,
                password: hashedPassword,
                userType: 'Collaborator',
                collaboratorType: OUTSOURCE_SLUG,
                groupSpecificAttributes: groupSpecificAttributes,
            });
        }

        // Filter Duplicates
        const emails = usersToProcess.map(u => u.email);
        const existingUsers = await Collaborator.find({ email: { $in: emails } }, { email: 1 }).exec();
        const existingEmails = new Set(existingUsers.map(u => u.email));
        const newUsers = usersToProcess.filter(u => !existingEmails.has(u.email));
        
        preCheckSkipped = usersToProcess.length - newUsers.length;

        console.log(`\nAttempting to insert ${newUsers.length} users...`);

        for (const userPayload of newUsers) {
            try {
                await Collaborator.create(userPayload);
                successfulInserts++;
            } catch (error) {
                if (error.code === 11000) {
                    duplicateErrors++;
                    console.warn(`Skipping duplicate email: ${userPayload.email}`);
                } else {
                    console.error(`Error saving ${userPayload.email}:`, error.message);
                }
            }
        }
        
        console.log(`\n✅ Import Complete.`);
        console.log(`   - Total Processed: ${usersToProcess.length}`);
        console.log(`   - Inserted: ${successfulInserts}`);
        console.log(`   - Skipped (Duplicate): ${preCheckSkipped + duplicateErrors}`);

    } catch (error) {
        console.error('\n❌ IMPORT ERROR:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

importOutsource();