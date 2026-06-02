import mongoose from 'mongoose';
const { Schema } = mongoose;

const couponRedemptionSchema = new Schema({
  coupon:           { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  customer:         { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  subscription:     { type: Schema.Types.ObjectId, ref: 'Subscription' },
  amountDiscounted: { type: Number, default: 0 },
}, { timestamps: true });

// Enforce one redemption per customer per coupon atomically
couponRedemptionSchema.index({ coupon: 1, customer: 1 }, { unique: true });

export default mongoose.model('CouponRedemption', couponRedemptionSchema);
