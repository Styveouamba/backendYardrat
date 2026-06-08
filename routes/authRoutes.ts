import express from 'express';
import { sendOTP, verifyOTP, register, login, getMe } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
