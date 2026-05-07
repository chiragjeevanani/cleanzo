import mongoose from 'mongoose';
const { Schema } = mongoose;

const cleanerApplicationSchema = new Schema({
  name:             { type: String, required: true, trim: true },
  phone:            { type: String, required: true, unique: true },
  email:            { type: String, lowercase: true },
  age:              { type: Number, required: true },
  city:             { type: String, required: true },
  fatherName:       { type: String, required: true },
  permanentAddress: { type: String, required: true },
  currentAddress:   { type: String, required: true },
  localReference: {
    name:           { type: String, required: true },
    phone:          { type: String, required: true },
  },
  kyc: {
    livePhoto:      { type: String }, // Cloudinary URL
    aadhaarPhoto:   { type: String }, // Cloudinary URL
    panPhoto:       { type: String }, // Cloudinary URL
  },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionNote:    { type: String },
  reviewedBy:       { type: Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt:       { type: Date },
}, { timestamps: true });

export default mongoose.model('CleanerApplication', cleanerApplicationSchema);
