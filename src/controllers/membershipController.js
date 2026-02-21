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
            if (existingMember.status === 'rejected') {
                // Instead of blocking, we delete the old rejected record so they can re-apply cleanly.
                console.log(`[registerMember] Found existing rejected record for ${mobile}. Deleting to allow re-application.`);
                await Member.deleteOne({ _id: existingMember._id });
            } else {
                return res.status(400).json({ message: 'Member with this Mobile, Aadhaar, or UTR already exists and is not rejected.' });
            }
        }

        // Handle File Uploads
        const photoPath = req.files['photo'] ? req.files['photo'][0].path.replace(/\\/g, "/") : null;
        const aadhaarCardPath = req.files['aadhaarCard'] ? req.files['aadhaarCard'][0].path.replace(/\\/g, "/") : null;
        const screenshotPath = req.files['paymentScreenshot'] ? req.files['paymentScreenshot'][0].path.replace(/\\/g, "/") : null;

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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search || '';

        let query = { status: 'pending' };
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Member.countDocuments(query);
        const members = await Member.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            data: members,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page
        });
    } catch (error) {
        console.error("Error fetching requests:", error);
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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search || '';
        const statusFilter = req.query.status || 'all';

        let query = {};
        
        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { memberId: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Member.countDocuments(query);
        const members = await Member.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        console.log(`Found ${members.length} members on page ${page}`);
        res.json({
            data: members,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page
        });
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

// @desc    Update member profile photo (Admin)
// @route   PUT /api/membership/admin/member/:id/photo
// @access  Public (Will be protected later)
export const updateMemberPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (!req.files || !req.files.photo) {
            return res.status(400).json({ message: 'No photo uploaded' });
        }

        const newPhotoUrl = req.files.photo[0].path.replace(/\\/g, '/');

        // Capture the old URL before we mutate the document
        const oldPhotoUrl = member.photoUrl;

        member.photoUrl = newPhotoUrl;
        await member.save();

        // Optionally, delete the old photo from the filesystem to save space
        if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl) {
            // Need dynamic import or require for fs
            import('fs').then(fs => {
                import('path').then(path => {
                    const oldPhotoPath = path.resolve(oldPhotoUrl);
                    fs.unlink(oldPhotoPath, (err) => {
                        if (err) {
                            console.error(`Failed to delete old photo at ${oldPhotoPath}`, err);
                        } else {
                            console.log(`Deleted replaced photo: ${oldPhotoPath}`);
                        }
                    });
                });
            });
        }

        res.status(200).json({
            message: 'Profile photo updated successfully',
            photoUrl: newPhotoUrl
        });

    } catch (error) {
        console.error('Update Photo Error:', error);
        res.status(500).json({ message: 'Server error updating photo' });
    }
};

// @desc    Download Member ID Card PDF (Admin / Public)
// @route   GET /api/membership/admin/member/:id/id-card-pdf
// @access  Public (Will be protected later)
export const getMemberIdCardPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.status !== 'approved') {
            return res.status(400).json({ message: 'Member is not approved yet' });
        }

        // Dynamically import the email service to avoid circular dependency issues if any
        const { generateIdCardPdf } = await import('../services/emailService.js');
        const pdfBuffer = await generateIdCardPdf(member);

        if (!pdfBuffer) {
            return res.status(500).json({ message: 'Failed to generate PDF' });
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${member.memberId || 'member'}_ID_Card.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.end(pdfBuffer);

    } catch (error) {
        console.error('Fetch ID Card PDF Error:', error);
        res.status(500).json({ message: 'Server error generating PDF' });
    }
};

// @desc    Download Member ID Card HTML (Admin / Public)
// @route   GET /api/membership/admin/member/:id/id-card-html
// @access  Public (Will be protected later)
export const getMemberIdCardHtml = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Member.findById(id);

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (member.status !== 'approved') {
            return res.status(400).json({ message: 'Member is not approved yet' });
        }

        const { generateIdCardHtml } = await import('../services/emailService.js');
        const htmlString = await generateIdCardHtml(member);

        res.set({
            'Content-Type': 'text/html'
        });

        res.send(htmlString);

    } catch (error) {
        console.error('Fetch ID Card HTML Error:', error);
        res.status(500).json({ message: 'Server error generating HTML' });
    }
};
