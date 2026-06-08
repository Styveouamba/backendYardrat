import { Response } from 'express';
import Transfer from '../models/Transfer';
import { AuthRequest } from '../middleware/auth';

const VALID_DIRECTIONS = ['waveToOrange', 'orangeToWave'] as const;
const PHONE_REGEX = /^(\+221|00221)?\s?[0-9 ]{8,}$/;

const normalizeSenegalNumber = (phone: string): string => {
  const digits = phone.replace(/\D+/g, '');

  if (/^221\d{9}$/.test(digits)) return `+${digits}`;
  if (/^00221\d{9}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) return `+221${digits.slice(1)}`;
  if (/^[7-9]\d{8}$/.test(digits)) return `+221${digits}`;

  return phone;
};

export const createTransfer = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { direction, amount, destination } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
      return;
    }

    if (!direction || !VALID_DIRECTIONS.includes(direction)) {
      res.status(400).json({ success: false, message: 'Direction de transfert invalide' });
      return;
    }

    const parsedAmount = typeof amount === 'string'
      ? parseFloat(amount.replace(/\s+/g, ''))
      : Number(amount);

    if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Montant invalide' });
      return;
    }

    if (!destination || typeof destination !== 'string' || !PHONE_REGEX.test(destination.trim())) {
      res.status(400).json({ success: false, message: 'Numéro de destination invalide' });
      return;
    }

    const normalizedDestination = normalizeSenegalNumber(destination.trim());

    if (user.balance < parsedAmount) {
      res.status(400).json({ success: false, message: 'Solde insuffisant' });
      return;
    }

    user.balance -= parsedAmount;
    await user.save();

    const transfer = await Transfer.create({
      userId: user._id,
      direction,
      amount: parsedAmount,
      destination: normalizedDestination,
      status: 'completed',
    });

    res.status(201).json({
      success: true,
      message: 'Transfert effectué avec succès',
      balance: user.balance,
      transfer,
    });
  } catch (error: any) {
    console.error('[Transfer] Error creating transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du transfert',
      error: error.message,
    });
  }
};

export const getTransferHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
      return;
    }

    const transfers = await Transfer.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, transfers });
  } catch (error: any) {
    console.error('[Transfer] Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la lecture de l'historique",
      error: error.message,
    });
  }
};