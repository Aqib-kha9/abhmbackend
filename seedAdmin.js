import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import Member from './src/models/Member.js';
import connectDB from './src/config/db.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        console.log('Cleaning database...');
        // Delete all existing members and admins
        await Member.deleteMany({});
        await Admin.deleteMany({});
        console.log('Database cleaned successfully');

        const admin = new Admin({
            username: 'admin',
            passwordHash: 'abhm@123', // Will be hashed by pre-save hook
            role: 'superadmin'
        });

        await admin.save();

        console.log('Admin user created successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedAdmin();
