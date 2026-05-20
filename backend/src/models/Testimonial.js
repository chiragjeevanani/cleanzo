import mongoose from 'mongoose';
const { Schema } = mongoose;

const testimonialSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  role:      { type: String, required: true, trim: true },
  text:      { type: String, required: true, trim: true },
  rating:    { type: Number, min: 1, max: 5, default: 5 },
  isActive:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Testimonial', testimonialSchema);
