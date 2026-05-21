import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema } = mongoose;

const partnerSocietySchema = new Schema({
  society:        { type: Schema.Types.ObjectId, ref: 'Society', required: true },
  contactName:    { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true, select: false },
  phone:          { type: String, trim: true },
  commissionRate: { type: Number, default: 5, min: 0, max: 100 }, // percentage set by admin
  isActive:       { type: Boolean, default: true },
  totalEarned:    { type: Number, default: 0 },   // cumulative ₹ commissions earned
  pendingBalance: { type: Number, default: 0 },   // balance not yet paid out
  role:           { type: String, default: 'society', enum: ['society'] },
  lastLogin:      { type: Date },
  fcmTokens:      { type: [String], default: [] },
  bankDetails: {
    accountName:   { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode:      { type: String, trim: true },
    bankName:      { type: String, trim: true },
    upiId:         { type: String, trim: true },
  },
}, { timestamps: true });

// Hash password before save
partnerSocietySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
partnerSocietySchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('PartnerSociety', partnerSocietySchema);
