import mongoose from 'mongoose';
const { Schema } = mongoose;

const vehicleCategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }, // e.g. 'small_car'
  description: { type: String },
  icon: { type: String }, // optional icon name or URL
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('VehicleCategory', vehicleCategorySchema);
