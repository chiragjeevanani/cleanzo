import mongoose from 'mongoose';
const { Schema } = mongoose;

const leaveRequestSchema = new Schema({
  cleaner: { 
    type: Schema.Types.ObjectId, 
    ref: 'Cleaner', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  }, // Normalized to IST midnight
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reason: { 
    type: String 
  },
  rejectionReason: { 
    type: String 
  }
}, { timestamps: true });

// A cleaner can have only one leave request per date
leaveRequestSchema.index({ cleaner: 1, date: 1 }, { unique: true });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
