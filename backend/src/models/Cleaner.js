import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const { Schema } = mongoose;

const cleanerSchema = new Schema({
  name:            { type: String, required: true, trim: true, maxlength: 100 },
  phone:           { type: String, required: true, unique: true, index: true },
  email:           { type: String, sparse: true, trim: true, lowercase: true, maxlength: 100 },
  password:        { type: String, select: false, default: null }, // Optional — set via admin or reset
  avatar:          { type: String, default: null },
  role:            { type: String, default: 'cleaner', enum: ['cleaner'] },
  rank:            { type: String, default: 'Junior Detailer',
                     enum: ['Junior Detailer', 'Detailer', 'Senior Detailer', 'Lead Detailer'] },
  assignedArea:    { type: String, trim: true, maxlength: 100 },
  city:            { type: String, required: true },
  rating:          { type: Number, default: 0, min: 0, max: 5 },
  completionRate:  { type: Number, default: 0 },
  totalCompleted:  { type: Number, default: 0 },
  isAvailable:     { type: Boolean, default: true },
  isActive:        { type: Boolean, default: true },
  dailyRate:       { type: Number, default: 500 },
  joiningDate:     { type: Date, default: Date.now },
  fcmToken:        { type: String, default: null },
  lastLogin:       { type: Date },
  // KYC & Personal Info
  age:              { type: Number },
  fatherName:       { type: String },
  currentAddress:   { type: String },
  permanentAddress: { type: String },
  localReference: {
    name:           { type: String },
    phone:          { type: String },
  },
  kycStatus:       { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted' },
  kycRejectionNote:{ type: String, default: null },
  kyc: {
    livePhoto:     { type: String, default: null },
    aadhaarPhoto:  { type: String, default: null },
    panPhoto:      { type: String, default: null },
    submittedAt:   { type: Date, default: null },
  },
}, { timestamps: true });

// Hash password before save if modified
cleanerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
cleanerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // No password set — OTP-only account
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Cleaner', cleanerSchema);
