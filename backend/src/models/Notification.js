import mongoose from 'mongoose';
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient:      { type: Schema.Types.ObjectId, required: true, index: true },
  recipientModel: { type: String, enum: ['Customer', 'Cleaner', 'Admin'], required: true },
  type:           { type: String, enum: ['service', 'subscription', 'offer', 'system', 'alert'], required: true },
  title:          { type: String, required: true },
  message:        { type: String, required: true },
  read:           { type: Boolean, default: false },
  data:           { type: Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
