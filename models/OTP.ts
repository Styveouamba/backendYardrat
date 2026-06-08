import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index pour supprimer automatiquement les OTP expirés
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOTP>('OTP', otpSchema);
