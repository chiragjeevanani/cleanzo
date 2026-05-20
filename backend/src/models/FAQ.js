import mongoose from 'mongoose';
const { Schema } = mongoose;

const faqSchema = new Schema({
  question:  { type: String, required: true, trim: true },
  answer:    { type: String, required: true, trim: true },
  isActive:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('FAQ', faqSchema);
