import mongoose from 'mongoose';
const { Schema } = mongoose;

const packageSchema = new Schema({
  name:      { type: String, required: true },
  tier:      { type: String, required: true },
  price:     { type: Number, required: true },
  duration:  { type: String, default: 'Monthly' },
  perDay:    { type: Number },
  features:  [{ type: String }],
  category:  { 
    type: String, 
    required: true, 
    default: 'sedan'
  },
  popular:   { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Package', packageSchema);
