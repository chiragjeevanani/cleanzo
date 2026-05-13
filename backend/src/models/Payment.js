import mongoose from 'mongoose';
const { Schema } = mongoose;

const paymentSchema = new Schema({
  customer:   { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  orderId:    { type: String, required: true, unique: true },   // razorpay_order_id
  paymentId:  { type: String, required: true, unique: true },   // razorpay_payment_id
  signature:  { type: String, required: true },
  amount:     { type: Number },                                  // in paise from Razorpay order
  currency:   { type: String, default: 'INR' },
  status:     { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
