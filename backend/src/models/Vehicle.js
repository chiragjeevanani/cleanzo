import mongoose from 'mongoose';
const { Schema } = mongoose;

// BRD §7.3 vehicle-based pricing table
export const VEHICLE_PRICING = {
  scooty:     199,
  bike:       249,
  small_car:  399,
  hatchback:  449,
  sedan:      499,
  mpv:        599,
  suv:        699,
  premium:    899,
};

const vehicleSchema = new Schema({
  customer:  { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  brand:     { type: String, required: true, trim: true },   // e.g. "Maruti", "Honda"
  model:     { type: String, required: true, trim: true },   // e.g. "Swift", "City"
  number:    { type: String, required: true, uppercase: true, trim: true },
  category:  {
    type: String,
    required: true,
    default: 'sedan'
  },
  color:     { type: String, default: '' },
  photos:    [{ type: String }],   // Cloudinary URLs
  videos:    [{ type: String }],   // Cloudinary URLs
  parking:   { type: String },     // Parking spot / instructions
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);

