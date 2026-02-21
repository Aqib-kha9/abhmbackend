import express from 'express';
import { registerMember, getPendingRequests, verifyRequest, checkStatus, getMemberById, getMembers, getDashboardStats, verifyPublicMember, updateMemberPhoto, getMemberIdCardPdf, getMemberIdCardHtml } from '../controllers/membershipController.js';
import upload from '../config/upload.js';

const router = express.Router();

// Public Route: User Registration
// Handles multipart/form-data for photo and screenshot
router.post('/join', upload.fields([
    { name: 'photo', maxCount: 1 }, 
    { name: 'aadhaarCard', maxCount: 1 },
    { name: 'paymentScreenshot', maxCount: 1 }
]), registerMember);

// Public Route: Check Status
router.post('/status', checkStatus);

// Public Route: Verify Member by ID
router.get('/public/verify/:id', verifyPublicMember);

// Admin Routes (To be protected later)

// Admin Routes (To be protected later)
router.get('/admin/pending-requests', getPendingRequests);
router.get('/admin/member/:id', getMemberById);
router.get('/admin/member/:id/id-card-pdf', getMemberIdCardPdf);
router.get('/admin/member/:id/id-card-html', getMemberIdCardHtml);
router.post('/admin/verify-request', verifyRequest);
router.put('/admin/member/:id/photo', upload.fields([{ name: 'photo', maxCount: 1 }]), updateMemberPhoto);
router.get('/admin/members', getMembers);
router.get('/admin/dashboard-stats', getDashboardStats);

export default router;
