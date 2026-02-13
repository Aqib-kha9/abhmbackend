import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`\x1b[36m%s\x1b[0m`, `📦 MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`\x1b[31m%s\x1b[0m`, `❌ Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
