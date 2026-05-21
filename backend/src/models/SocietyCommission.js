import mongoose from 'mongoose';
const { Schema } = mongoose;

const societyCommissionSchema = new Schema({
  partnerSociety:     { type: Schema.Types.ObjectId, ref: 'PartnerSociety', required: true, index: true },
  subscription:       { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  customer:           { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  subscriptionAmount: { type: Number, required: true },
  commissionRate:     { type: Number, required: true },  // snapshot of rate at time of event
  commissionAmount:   { type: Number, required: true },  // computed: amount * rate / 100
  status:             { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
}, { timestamps: true });

societyCommissionSchema.index({ partnerSociety: 1, createdAt: -1 });

export default mongoose.model('SocietyCommission', societyCommissionSchema);
