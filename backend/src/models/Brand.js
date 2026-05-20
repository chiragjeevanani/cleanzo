import mongoose from 'mongoose';
const { Schema } = mongoose;

const brandSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  models: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Brand', brandSchema);
