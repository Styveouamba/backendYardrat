import OTP from '../models/OTP';

class OTPService {
  // Générer un code OTP à 6 chiffres
  generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Créer et sauvegarder un OTP
  async createOTP(phoneNumber: string): Promise<string> {
    // Supprimer les anciens OTP non vérifiés pour ce numéro
    await OTP.deleteMany({ phoneNumber, verified: false });

    const code = this.generateOTPCode();
    const expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES || '5');
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await OTP.create({
      phoneNumber,
      code,
      expiresAt,
      verified: false
    });

    return code;
  }

  // Envoyer un OTP par SMS (simulation pour le moment)
  async sendOTP(phoneNumber: string): Promise<boolean> {
    try {
      const code = await this.createOTP(phoneNumber);
      console.log(`📱 Code OTP pour ${phoneNumber}: ${code}`);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'OTP:', error);
      return false;
    }
  }

  // Vérifier un code OTP sans le consommer
  async validateOTP(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await OTP.findOne({
      phoneNumber,
      code,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    return !!otp;
  }

  // Vérifier un code OTP et le marquer comme consommé
  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await OTP.findOne({
      phoneNumber,
      code,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otp) {
      return false;
    }

    otp.verified = true;
    await otp.save();
    return true;
  }
}

export default new OTPService();
