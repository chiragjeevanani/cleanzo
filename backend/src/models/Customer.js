import mongoose from 'mongoose';
import crypto from 'crypto';
const { Schema } = mongoose;

// Generate a short unique referral code without external dependencies
const generateReferralCode = () =>
  crypto.randomBytes(5).toString('hex').toUpperCase();


const customerSchema = new Schema({
  firstName:    { type: String, required: true, trim: true, maxlength: 50 },
  lastName:     { type: String, required: true, trim: true, maxlength: 50 },
  // Virtual 'name' field for backward compatibility
  phone:        { type: String, required: true, unique: true, index: true },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
  avatar:       { type: String, default: null },
  city:         { type: String, required: true, trim: true, maxlength: 50 },
  role:         { type: String, default: 'customer', enum: ['customer'] },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy:   { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  referralDiscount: {
    isActive:   { type: Boolean, default: false },
    percentage: { type: Number, default: 0 },
    expiresAt:  { type: Date },
  },
  addresses:  [{
    label:     { type: String },
    line1:     { type: String },
    line2:     { type: String },
    societyName: { type: String },
    tower:     { type: String },
    flat:      { type: String },
    city:      { type: String },
    state:     { type: String },
    pincode:   { type: String },
    society:   { type: Schema.Types.ObjectId, ref: 'Society' },
    isDefault: { type: Boolean, default: false }
  }],
  fcmTokens:  { type: [String], default: [] },
  isActive:   { type: Boolean, default: true },
  // Set when the user self-deletes their account from the app (soft delete).
  // A suspended account cannot log in until an admin restores it.
  suspendedAt:      { type: Date, default: null },
  suspensionReason: { type: String, default: null },
  lastLogin:  { type: Date },
}, { timestamps: true });

// Virtual: full name for backward compatibility
customerSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Generate referral code before first save
customerSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = generateReferralCode();
  }
  next();
});

// Set JSON to include virtuals
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Customer', customerSchema);
