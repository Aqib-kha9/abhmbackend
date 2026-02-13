import express from 'express';
import { getPaymentConfig } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/config', getPaymentConfig);

export default router;
