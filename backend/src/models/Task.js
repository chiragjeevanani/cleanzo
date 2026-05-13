import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema({
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
  customer:     { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  cleaner:      { type: Schema.Types.ObjectId, ref: 'Cleaner', index: true },
  vehicle:      { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  date:         { type: Date, required: true, index: true },
  scheduledTime:{ type: String, default: '07:00 AM' },
  completedTime:{ type: String },
  status:       { type: String,
                  enum: ['pending', 'in-progress', 'completed', 'skipped', 'missed', 'rain', 'curfew'],
                  default: 'pending', index: true },
  skipReason:   { type: String, trim: true, maxlength: 200 },
  creditBack:   { type: Boolean, default: false },
  photos: {
    before: [{ type: String }],
    after:  [{ type: String }],
  },
  notes:       { type: String, trim: true, maxlength: 500 },
  packageName: { type: String },
}, { timestamps: true });

// Compound indexes for the two most frequent query patterns
taskSchema.index({ cleaner: 1, date: 1 });        // getTodayTasks
taskSchema.index({ cleaner: 1, status: 1 });       // getHistory filter
taskSchema.index({ customer: 1, status: 1 });      // customer history/home

export default mongoose.model('Task', taskSchema);
