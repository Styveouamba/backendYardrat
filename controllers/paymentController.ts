import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { initializePayment } from '../services/nabooPayService';

const normalizeSenegalNumber = (phone: string): string => {
  const digits = phone.replace(/\D+/g, '');

  if (/^221\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^00221\d{9}$/.test(digits)) {
    return `+${digits.slice(2)}`;
  }

  if (/^0\d{9}$/.test(digits)) {
    return `+221${digits.slice(1)}`;
  }

  if (/^[7-9]\d{8}$/.test(digits)) {
    return `+221${digits}`;
  }

  return phone;
};

export const initiatePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { amount, direction, destination } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
      return;
    }

    if (!direction || !['waveToOrange', 'orangeToWave'].includes(direction)) {
      res.status(400).json({ success: false, message: 'Direction invalide' });
      return;
    }

    const parsedAmount = typeof amount === 'string'
      ? parseFloat(amount.replace(/\s+/g, ''))
      : Number(amount);

    if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Montant invalide' });
      return;
    }

    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      console.warn('[Payment] Invalid destination', { userId: user._id.toString(), destination });
      res.status(400).json({ success: false, message: 'Destination invalide' });
      return;
    }

    const normalizedDestination = normalizeSenegalNumber(destination.trim());
    if (normalizedDestination !== destination.trim()) {
      console.log('[Payment] Normalized destination', {
        userId: user._id.toString(),
        originalDestination: destination.trim(),
        normalizedDestination,
      });
    }

    const paymentMethod = direction === 'waveToOrange' ? 'wave' : 'orange_money';
    console.log('[Payment] Initializing payment', {
      userId: user._id.toString(),
      amount: parsedAmount,
      direction,
      destination: normalizedDestination,
      paymentMethod,
    });

    const payment = await initializePayment(
      parsedAmount,
      paymentMethod,
      direction as 'waveToOrange' | 'orangeToWave',
      normalizedDestination,
      user._id.toString()
    );

    console.log('[Payment] Payment initialized', {
      userId: user._id.toString(),
      orderId: payment.order_id,
      checkoutUrl: payment.checkout_url,
      status: payment.transaction_status,
    });

    res.status(200).json({
      success: true,
      paymentUrl: payment.checkout_url,
      transactionId: payment.order_id,
    });
  } catch (error: any) {
    console.error('[Payment] Error initiating payment:', {
      message: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de l\'initialisation du paiement' });
  }
};

export const paymentSuccess = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ success: true, message: 'Paiement réussi, merci.' });
};

export const paymentError = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ success: false, message: 'Le paiement a échoué.' });
};
