import express from 'express';
import { initiatePayment, paymentSuccess, paymentError } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/initiate', protect, initiatePayment);
router.get('/success', paymentSuccess);
router.get('/error', paymentError);

export default router;
