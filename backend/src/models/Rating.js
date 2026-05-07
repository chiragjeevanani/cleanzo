import mongoose from 'mongoose';
const { Schema } = mongoose;

const ratingSchema = new Schema({
  task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  cleaner: { type: Schema.Types.ObjectId, ref: 'Cleaner', required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

// Optional: compound indexes for quick analytics
ratingSchema.index({ cleaner: 1, score: -1 });
ratingSchema.index({ customer: 1 });

export default mongoose.model('Rating', ratingSchema);
