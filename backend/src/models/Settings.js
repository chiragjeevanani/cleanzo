import mongoose from 'mongoose';
const { Schema } = mongoose;

const settingsSchema = new Schema({
  key:         { type: String, required: true, unique: true },
  value:       { type: Schema.Types.Mixed, required: true },
  description: { type: String },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
