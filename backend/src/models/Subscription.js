import mongoose from 'mongoose';
const { Schema } = mongoose;

const subscriptionSchema = new Schema({
  customer:        { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  vehicle:         { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  package:         { type: Schema.Types.ObjectId, ref: 'Package' }, // Optional for trials
  society:         { type: Schema.Types.ObjectId, ref: 'Society' }, // Missing required true for backward compatibility right now
  slot:            { type: String }, // Slot ID like "05_06_AM"
  status:          { type: String, enum: ['Active', 'Paused', 'Expired', 'Cancelled'], default: 'Active', index: true },
  isTrial:         { type: Boolean, default: false },
  startDate:       { type: Date, required: true },
  endDate:         { type: Date, required: true },
  totalDays:       { type: Number, required: true },
  completedDays:   { type: Number, default: 0 },
  skippedDays:     { type: Number, default: 0 },
  creditedDays:    { type: Number, default: 0 },
  remainingDays:   { type: Number },
  nextWash:        { type: Date },
  assignedCleaner: { type: Schema.Types.ObjectId, ref: 'Cleaner' },
  paymentId:       { type: String },
  amount:          { type: Number, required: true },
  priorityFee:     { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountNote:    { type: String },
  couponCode:      { type: String },
  couponDiscount:  { type: Number, default: 0 },
  isPremiumOverride: { type: Boolean, default: false },
  overrideReason:    { type: String },
  specialInstructions: { type: String, maxlength: 200 },
  maxSkips:        { type: Number, default: 1 },
  skipsUsed:       { type: Number, default: 0 },
  cancelledAt:     { type: Date },
  cancelledBy:     { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
