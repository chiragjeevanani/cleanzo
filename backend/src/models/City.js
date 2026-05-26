import mongoose from 'mongoose';
const { Schema } = mongoose;

const citySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  state: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  launchDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('City', citySchema);
