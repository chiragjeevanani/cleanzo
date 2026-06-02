import mongoose from 'mongoose';
const { Schema } = mongoose;

const couponSchema = new Schema({
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  description:    { type: String, default: '' },
  discountType:   { type: String, enum: ['percent', 'flat'], required: true },
  discountValue:  { type: Number, required: true, min: 0 },
  // Which booking action this coupon is valid for
  appliesTo:      { type: String, enum: ['first_purchase', 'renewal', 'extension'], required: true },
  // Societies this coupon is limited to. Empty = valid for all societies.
  societies:      [{ type: Schema.Types.ObjectId, ref: 'Society' }],
  // Usage controls
  expiresAt:       { type: Date },                        // optional; null = never expires
  maxRedemptions:  { type: Number, default: null },       // null = unlimited total uses
  redemptionCount: { type: Number, default: 0 },
  oncePerCustomer: { type: Boolean, default: true },
  minOrderAmount:  { type: Number, default: 0 },
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);
