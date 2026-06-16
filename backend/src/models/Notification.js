import mongoose from 'mongoose';
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient:          { type: Schema.Types.ObjectId, required: false, index: true, refPath: 'recipientModel' },
  recipientModel:     { type: String, enum: ['Customer', 'Cleaner', 'Admin', 'Broadcast'], required: false },
  type:               { type: String, enum: ['service', 'subscription', 'offer', 'system', 'alert', 'promo', 'reminder'], required: true },
  title:              { type: String, required: true },
  message:            { type: String, required: true },
  read:               { type: Boolean, default: false },
  link:               { type: String, default: null },
  data:               { type: Schema.Types.Mixed },
  isBroadcast:        { type: Boolean, default: false },
  broadcastTarget:    { type: String, enum: ['all', 'customers', 'cleaners', 'society'], default: null },
  isHiddenFromAdmin:  { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
