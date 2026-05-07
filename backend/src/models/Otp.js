import mongoose from 'mongoose';
const { Schema } = mongoose;

const otpSchema = new Schema({
  phone:     { type: String, required: true, index: true },
  code:      { type: String, required: true },
  role:      { type: String, enum: ['customer', 'cleaner', 'admin'], required: true },
  attempts:  { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL auto-delete
}, { timestamps: true });

export default mongoose.model('Otp', otpSchema);
