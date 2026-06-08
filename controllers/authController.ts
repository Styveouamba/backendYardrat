import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import otpService from '../services/otpService';
import { AuthRequest } from '../middleware/auth';
import { StringValue } from 'ms';


// Générer un token JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as StringValue
  });
};

// @desc    Envoyer un code OTP pour l'inscription
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone est requis'
      });
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Ce numéro de téléphone est déjà enregistré'
      });
      return;
    }

    // Envoyer l'OTP
    const sent = await otpService.sendOTP(phoneNumber);

    if (!sent) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi du code OTP'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Code OTP envoyé avec succès'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Vérifier un code OTP avant la création du profil
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
      res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone et le code OTP sont requis'
      });
      return;
    }

    const isValidOTP = await otpService.validateOTP(phoneNumber, otpCode);
    if (!isValidOTP) {
      res.status(400).json({
        success: false,
        message: 'Code OTP invalide ou expiré'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP valide, vous pouvez saisir votre nom et votre PIN'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Créer un nouveau compte
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, pin, otpCode, firstName, lastName } = req.body;

    // Validation
    if (!phoneNumber || !pin || !otpCode || !firstName) {
      res.status(400).json({
        success: false,
        message: 'Veuillez fournir le numéro, le nom, le code OTP et le PIN'
      });
      return;
    }

    if (pin.length < 4) {
      res.status(400).json({
        success: false,
        message: 'Le PIN doit contenir au moins 4 chiffres'
      });
      return;
    }
    
    if (firstName.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Le nom est requis'
      });
      return;
    }

    // Vérifier l'OTP
    const isValidOTP = await otpService.verifyOTP(phoneNumber, otpCode);
    if (!isValidOTP) {
      res.status(400).json({
        success: false,
        message: 'Code OTP invalide ou expiré'
      });
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Ce numéro est déjà enregistré'
      });
      return;
    }

    // Créer l'utilisateur
    const user = await User.create({
      phoneNumber,
      pin,
      firstName,
      lastName,
      isPhoneVerified: true
    });

    // Générer le token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          isPhoneVerified: user.isPhoneVerified
        },
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Connexion
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
      res.status(400).json({
        success: false,
        message: 'Veuillez fournir le numéro et le PIN'
      });
      return;
    }

    // Trouver l'utilisateur (inclure le pin pour la comparaison)
    const user = await User.findOne({ phoneNumber }).select('+pin');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
      return;
    }

    // Vérifier le PIN
    const isMatch = await user.comparePin(pin);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
      return;
    }

    // Générer le token
    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
          isPhoneVerified: user.isPhoneVerified
        },
        token
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    res.status(200).json({
      success: true,
      data: {
        id: user?._id,
        phoneNumber: user?.phoneNumber,
        firstName: user?.firstName,
        lastName: user?.lastName,
        balance: user?.balance,
        isPhoneVerified: user?.isPhoneVerified
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};
