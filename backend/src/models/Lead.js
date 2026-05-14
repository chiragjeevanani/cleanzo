import mongoose from 'mongoose';
const { Schema } = mongoose;

const leadSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  city: { type: String, required: true },
  requestedArea: { type: String, trim: true },
  requestedSociety: { type: String, trim: true },
  pincode: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'converted'], 
    default: 'pending' 
  },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);
