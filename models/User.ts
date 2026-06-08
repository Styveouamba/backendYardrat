import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  phoneNumber: string;
  pin: string;
  firstName?: string;
  lastName?: string;
  isPhoneVerified: boolean;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  comparePin(enteredPin: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis'],
      unique: true,
      trim: true,
      match: [/^(\+221|00221)?[7][0-9]{8}$/, 'Format de numéro invalide (ex: +221771234567)']
    },
    pin: {
      type: String,
      required: [true, 'Le code PIN est requis'],
      minlength: [4, 'Le PIN doit contenir au moins 4 chiffres'],
      select: false
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Le solde ne peut pas être négatif']
    }
  },
  {
    timestamps: true
  }
);

// Hash du PIN avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('pin')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

// Méthode pour comparer le PIN
userSchema.methods.comparePin = async function (enteredPin: string): Promise<boolean> {
  return await bcrypt.compare(enteredPin, this.pin);
};

export default mongoose.model<IUser>('User', userSchema);
