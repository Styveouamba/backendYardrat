import mongoose, { Document, Schema } from 'mongoose';

export interface ITransfer extends Document {
  userId: mongoose.Types.ObjectId;
  direction: 'waveToOrange' | 'orangeToWave';
  amount: number;
  destination: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const transferSchema = new Schema<ITransfer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ['waveToOrange', 'orangeToWave'],
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Le montant doit être supérieur à 0'],
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITransfer>('Transfer', transferSchema);
