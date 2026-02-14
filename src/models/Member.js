import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
    // Personal Details
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    fatherHusbandName: { type: String, required: true, trim: true }, // "Father's / Husband's Name"
    dob: { type: String, required: true },
    age: { type: Number },
    bloodGroup: { type: String, required: true, trim: true },
    education: { type: String, trim: true }, // "Qualification"
    profession: { type: String, required: true, trim: true },
    emotionalArea: { type: String, required: true, trim: true }, // Interest Area
    familyMembersDetails: { type: String, trim: true }, // "Family Members" (Count or Names)
    aadhaarNumber: { type: String, required: true, trim: true, unique: true },
    aadhaarCardUrl: { type: String }, // Path to uploaded Aadhaar card image

    // Contact Details
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true },

    // Present Address
    presentAddress: {
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, default: 'Madhya Pradesh' },
        pincode: { type: String, required: true, trim: true },
        country: { type: String, default: 'India' }
    },

    // Permanent Address
    permanentAddress: {
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, default: 'Madhya Pradesh' },
        pincode: { type: String, required: true, trim: true },
        country: { type: String, default: 'India' }
    },

    // Administrative Details
    district: { type: String, required: true, trim: true },
    constituency: { type: String, trim: true }, // "Constituency"
    panchayat: { type: String, trim: true },
    taluk: { type: String, trim: true },
    corporation: { type: String, trim: true }, // "Corporation / Municipality"
    wardNumber: { type: String, trim: true },
    employmentStatus: { type: String, trim: true },
    previousExperience: { type: String, trim: true },

    // Official Details
    memberId: { type: String, unique: true, sparse: true }, // Generated upon approval
    designation: { type: String, default: 'Member' },
    photoUrl: { type: String }, // Path to uploaded photo

    // Payment Verification
    payment: {
        amount: { type: Number, required: true, default: 10 },
        utrNumber: { type: String, required: true, trim: true },
        screenshotUrl: { type: String, required: false }, // Path to uploaded payment screenshot
        timestamp: { type: Date, default: Date.now }
    },

    // Administrative Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String },
    
}, {
    timestamps: true
});

const Member = mongoose.model('Member', memberSchema);

export default Member;
