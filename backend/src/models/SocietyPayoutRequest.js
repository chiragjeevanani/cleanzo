import mongoose from 'mongoose';
const { Schema } = mongoose;

const societyPayoutRequestSchema = new Schema({
  partnerSociety: { type: Schema.Types.ObjectId, ref: 'PartnerSociety', required: true, index: true },
  amount:         { type: Number, required: true },         // amount requested
  bankDetails: {
    accountName:   { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode:      { type: String, trim: true },
    bankName:      { type: String, trim: true },
    upiId:         { type: String, trim: true },
  },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminRemark:    { type: String, trim: true },             // admin note on approve/reject
  processedAt:    { type: Date },
  processedBy:    { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

societyPayoutRequestSchema.index({ partnerSociety: 1, createdAt: -1 });

export default mongoose.model('SocietyPayoutRequest', societyPayoutRequestSchema);
