import mongoose from 'mongoose';
const { Schema } = mongoose;

const slotSchema = new Schema({
  slotId: { type: String, required: true }, // e.g. "05_06_AM"
  timeWindow: { type: String, required: true }, // e.g. "05:00 AM - 06:00 AM"
  maxVehicles: { type: Number, default: 20 },
  currentCount: { type: Number, default: 0 },
});

const societySchema = new Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  slots: [slotSchema],
  cleaners: [{ type: Schema.Types.ObjectId, ref: 'Cleaner' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Optional: index for faster city lookups
societySchema.index({ city: 1 });

export default mongoose.model('Society', societySchema);
