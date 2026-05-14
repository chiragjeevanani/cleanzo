import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'user_created', 'user_deleted', 'cleaner_created', 'cleaner_deleted', 
      'application_submitted', 'kyc_approved', 'kyc_rejected', 
      'subscription_created', 'task_completed', 'system',
      'product_created', 'product_updated', 'product_deleted',
      'order_placed', 'order_updated'
    ]
  },
  message: {
    type: String,
    required: true
  },
  performer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  metadata: {
    type: Object
  }
}, { timestamps: true });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
