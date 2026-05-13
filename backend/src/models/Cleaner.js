import mongoose from 'mongoose';
const { Schema } = mongoose;

const cleanerSchema = new Schema({
  name:            { type: String, required: true, trim: true, maxlength: 100 },
  phone:           { type: String, required: true, unique: true, index: true },
  email:           { type: String, sparse: true, trim: true, lowercase: true, maxlength: 100 },
  avatar:          { type: String, default: null },
  role:            { type: String, default: 'cleaner', enum: ['cleaner'] },
  rank:            { type: String, default: 'Junior Detailer',
                     enum: ['Junior Detailer', 'Detailer', 'Senior Detailer', 'Lead Detailer'] },
  assignedArea:    { type: String, trim: true, maxlength: 100 },
  city:            { type: String, required: true },
  rating:          { type: Number, default: 0, min: 0, max: 5 },
  completionRate:  { type: Number, default: 0 },
  totalCompleted:  { type: Number, default: 0 },
  isAvailable:     { type: Boolean, default: true },
  isActive:        { type: Boolean, default: true },
  dailyRate:       { type: Number, default: 500 },
  joiningDate:     { type: Date, default: Date.now },
  fcmToken:        { type: String, default: null },
  lastLogin:       { type: Date },
  // KYC
  kycStatus:       { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted' },
  kycRejectionNote:{ type: String, default: null },
  kyc: {
    livePhoto:     { type: String, default: null },  // Cloudinary URL
    aadhaarPhoto:  { type: String, default: null },  // Cloudinary URL
    panPhoto:      { type: String, default: null },  // Cloudinary URL
    submittedAt:   { type: Date, default: null },
  },
}, { timestamps: true });

export default mongoose.model('Cleaner', cleanerSchema);
