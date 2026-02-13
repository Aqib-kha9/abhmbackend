import app from './app.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
// Connect to Database
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\x1b[35m%s\x1b[0m`, `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
});
