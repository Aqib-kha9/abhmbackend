import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';
import connectDB from './src/config/db.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if admin exists
        const adminExists = await Admin.findOne({ username: 'admin' });

        if (adminExists) {
            console.log('Admin user already exists');
            process.exit();
        }

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
