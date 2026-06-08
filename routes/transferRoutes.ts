import express from 'express';
import { createTransfer, getTransferHistory } from '../controllers/transferController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, createTransfer);
router.get('/history', protect, getTransferHistory);

export default router;
