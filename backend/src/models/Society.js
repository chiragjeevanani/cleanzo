import mongoose from 'mongoose';
const { Schema } = mongoose;

const slotSchema = new Schema({
  slotId:      { type: String, required: true },
  timeWindow:  { type: String, required: true },
  maxVehicles: { type: Number, default: 20 },
  currentCount:{ type: Number, default: 0 },
});

const towerSchema = new Schema({
  name:   { type: String, required: true, trim: true }, // e.g. "Tower A", "Block 1"
  blocks: [{ type: String, trim: true }],               // e.g. ["Floor 1", "Floor 2"]
}, { _id: false });

const societySchema = new Schema({
  name:     { type: String, required: true, trim: true },
  city:     { type: String, required: true, trim: true },
  area:     { type: String, required: true, trim: true },
  pincode:  { type: String, required: true, trim: true },
  address:  { type: String, required: true },
  slots:    [slotSchema],
  towers:   [towerSchema],
  cleaners: [{ type: Schema.Types.ObjectId, ref: 'Cleaner' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

societySchema.index({ city: 1 });
societySchema.index({ area: 1 });
societySchema.index({ pincode: 1 });
societySchema.index({ name: 'text', area: 'text' });

export default mongoose.model('Society', societySchema);
