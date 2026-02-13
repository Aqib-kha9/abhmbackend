import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

// Match user entered password to hashed password in database
adminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Encrypt password using bcrypt
adminSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
