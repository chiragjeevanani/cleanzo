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
  area: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  slots: [slotSchema],
  cleaners: [{ type: Schema.Types.ObjectId, ref: 'Cleaner' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Indexes for faster lookups
societySchema.index({ city: 1 });
societySchema.index({ area: 1 });
societySchema.index({ pincode: 1 });
societySchema.index({ name: 'text', area: 'text' }); // Text index for search

export default mongoose.model('Society', societySchema);
