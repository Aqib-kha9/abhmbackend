import Member from '../models/Member.js';
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService.js';

// @desc    Register a new member
// @route   POST /api/membership/join
// @access  Public
export const registerMember = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            gender, 
            fatherHusbandName, 
            dob, 
            age, 
            bloodGroup, 
            education, 
            profession, 
            emotionalArea, 
            familyMembersDetails, 
            aadhaarNumber, 
            mobile, 
            email, 
            presentAddress, // Expected as JSON string or object depending on frontend
            permanentAddress, // Expected as JSON string or object depending on frontend
            district, 
            constituency, 
            panchayat, 
            taluk, 
            corporation, 
            wardNumber, 
            employmentStatus, 
            previousExperience, 
            utrNumber 
        } = req.body;

        // Check if user already exists with same mobile, Aadhaar or UTR
        const existingMember = await Member.findOne({ 
            $or: [
                { mobile }, 
                { aadhaarNumber },
                { 'payment.utrNumber': utrNumber }
            ] 
        });

        if (existingMember) {
            return res.status(400).json({ message: 'Member with this Mobile, Aadhaar, or UTR already exists.' });
        }

        // Handle File Uploads
        const photoPath = req.files['photo'] ? req.files['photo'][0].path.replace(/\\/g, "/") : null;
        const aadhaarCardPath = req.files['aadhaarCard'] ? req.files['aadhaarCard'][0].path.replace(/\\/g, "/") : null;
        const screenshotPath = req.files['paymentScreenshot'] ? req.files['paymentScreenshot'][0].path.replace(/\\/g, "/") : null;

        if (!screenshotPath) {
            return res.status(400).json({ message: 'Payment screenshot is required.' });
        }

        // Parse Addresses if they come as strings (from FormData)
        let parsedPresentAddress = presentAddress;
        let parsedPermanentAddress = permanentAddress;

        if (typeof presentAddress === 'string') {
            try { parsedPresentAddress = JSON.parse(presentAddress); } catch (e) { console.error("Address Parse Error", e); }
        }
        if (typeof permanentAddress === 'string') {
            try { parsedPermanentAddress = JSON.parse(permanentAddress); } catch (e) { console.error("Address Parse Error", e); }
        }

        const newMember = new Member({
            firstName,
            lastName,
            gender,
            fatherHusbandName,
            dob,
            age,
            bloodGroup,
            education,
            profession,
            emotionalArea,
            familyMembersDetails,
            aadhaarNumber,
            mobile,
            email,
            presentAddress: parsedPresentAddress,
            permanentAddress: parsedPermanentAddress,
            district,
            constituency,
            panchayat,
            taluk,
            corporation,
            wardNumber,
            employmentStatus,
            previousExperience,
            previousExperience,
            photoUrl: photoPath,
            aadhaarCardUrl: aadhaarCardPath,
            payment: {
                amount: 10,
                utrNumber,
                screenshotUrl: screenshotPath
            }
        });

        await newMember.save();

        res.status(201).json({
            message: 'Registration successful! Your request is pending verification.',
            memberId: newMember._id
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server Error during registration.', error: error.message });
    }
};

// @desc    Get all pending requests
// @route   GET /api/admin/pending-requests
// @access  Private (Admin)
export const getPendingRequests = async (req, res) => {
    try {
        const members = await Member.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests.' });
    }
};

// @desc    Get single member by ID
// @route   GET /api/admin/member/:id
// @access  Private (Admin)
export const getMemberById = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if(!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching member details.' });
    }
};

// @desc    Verify a request (Approve/Reject)
// @route   POST /api/membership/admin/verify-request
// @access  Private (Admin)
export const verifyRequest = async (req, res) => {
    try {
        console.log(`[Controller] verifyRequest called. Body:`, req.body);
        const { memberId, status, rejectionReason } = req.body;

        const member = await Member.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        if (status === 'approved') {
            member.status = 'approved';
            
            // Generate Semantic Member ID: ABHM-MP-{Year}-{Random4}
            // Only generate if not already present
            if (!member.memberId) {
                const year = new Date().getFullYear();
                const random = Math.floor(1000 + Math.random() * 9000);
                member.memberId = `ABHM-MP-${year}-${random}`;
            }
            
            await member.save();
            
            // Send Welcome Email (Async - Awaited for Debugging)
            console.log(`[Controller] Calling sendApprovalEmail for ${member.email}`);
            try {
                await sendApprovalEmail(member);
                console.log(`[Controller] Email process completed.`);
            } catch (emailErr) {
                console.error(`[Controller] Email failed:`, emailErr);
            }

            return res.json({ message: 'Member approved successfully.', member });
        } 
        
        if (status === 'rejected') {
            member.status = 'rejected';
            member.rejectionReason = rejectionReason || 'Verification failed.';
            await member.save();

            // Send Rejection Email (Async)
            console.log(`Triggering rejection email for ${member.email}`);
            sendRejectionEmail(member, rejectionReason);

            return res.json({ message: 'Member rejected.', member });
        }

        res.status(400).json({ message: 'Invalid status provided.' });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: 'Error verifying request.' });
    }
};

// @desc    Get all members (Active, Pending, Rejected) for Admin List
// @route   GET /api/admin/members
// @access  Private (Admin)
export const getMembers = async (req, res) => {
    console.log("HIT: getMembers controller");
    try {
        const members = await Member.find({}).sort({ createdAt: -1 });
        console.log(`Found ${members.length} members`);
        res.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).json({ message: 'Error fetching members list.' });
    }
};

// @desc    Check Application Status
// @route   POST /api/membership/status
// @access  Public
export const checkStatus = async (req, res) => {
    try {
        const { searchInput } = req.body;

        if (!searchInput) {
            return res.status(400).json({ message: 'Please enter a Mobile Number or Reference ID.' });
        }

        // Try to find by Mobile or ID
        let member;
        
        // Check if input is a valid ObjectId (Reference ID)
        if (searchInput.match(/^[0-9a-fA-F]{24}$/)) {
            member = await Member.findById(searchInput).select('firstName lastName district status memberId rejectionReason createdAt');
        } else {
            // Assume it's a mobile number
            member = await Member.findOne({ mobile: searchInput }).select('firstName lastName district status memberId rejectionReason createdAt');
        }

        if (!member) {
            return res.status(404).json({ message: 'No application found with these details.' });
        }

        res.json({
            success: true,
            data: member
        });

    } catch (error) {
        console.error("Status Check Error:", error);
        res.status(500).json({ message: 'Error checking status.' });
    }
};
// @desc    Get Dashboard Stats
// @route   GET /api/membership/admin/dashboard-stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res) => {
    try {
        const totalMembers = await Member.countDocuments({});
        const pendingRequests = await Member.countDocuments({ status: 'pending' });
        
        // Calculate Revenue (Sum of amounts for approved/paid members)
        const revenueAgg = await Member.aggregate([
            { $match: { status: { $in: ['approved', 'pending'] } } }, // Consider pending as potential revenue or just approved? Usually confirmed revenue is approved. Let's do approved for now.
            // Actually, if they are pending, they have paid. Let's include both or just approved?
            // User likely wants "Total Revenue" from all payments received.
            { $group: { _id: null, total: { $sum: "$payment.amount" } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        // Recent Members (Limit 5)
        const recentMembers = await Member.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('firstName lastName memberId district status photoUrl createdAt');

        // Monthly Growth (Members created this month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newMembersThisMonth = await Member.countDocuments({ createdAt: { $gte: startOfMonth } });

        res.json({
            totalMembers,
            pendingRequests,
            totalRevenue,
            recentMembers,
            newMembersThisMonth
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: 'Error fetching dashboard stats.' });
    }
};

// @desc    Public Verification of Member
// @route   GET /api/membership/public/verify/:id
// @access  Public
// @desc    Public Verification of Member
// @route   GET /api/membership/public/verify/:id
// @access  Public
export const verifyPublicMember = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find member by memberId (Semantic ID)
        // Check for ANY status to give specific feedback
        const member = await Member.findOne({ memberId: id })
            .select('firstName lastName photoUrl district status memberId createdAt');

        if (!member) {
            return res.status(404).json({ 
                isValid: false, 
                message: 'Member ID not found.' 
            });
        }

        if (member.status === 'pending') {
            return res.status(200).json({
                isValid: false,
                message: 'Membership Application is Pending Approval.',
                member: {
                    firstName: member.firstName,
                    lastName: member.lastName,
                    status: 'pending'
                    // Don't show photo/district for pending to be safe, or maybe it's fine.
                } 
            });
        }

        if (member.status === 'rejected') {
            return res.status(200).json({
                isValid: false,
                message: 'Membership Application was Rejected.',
                member: {
                    status: 'rejected'
                }
            });
        }

        // Default: Approved
        if (member.status === 'approved') {
            return res.json({
                isValid: true,
                message: 'Membership Verified Successfully',
                member
            });
        }

        // Fallback for other statuses (revoked, etc.)
        res.status(200).json({
            isValid: false,
            message: `Membership is ${member.status}.`,
            member: { status: member.status }
        });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: 'Server Error during verification.' });
    }
};
