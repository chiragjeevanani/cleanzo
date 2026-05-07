import mongoose from 'mongoose';
const { Schema } = mongoose;

const attendanceSchema = new Schema({
  cleaner:    { type: Schema.Types.ObjectId, ref: 'Cleaner', required: true },
  date:       { type: Date, required: true }, // Normalized to midnight
  status:     { type: String, enum: ['present', 'absent', 'leave'], default: 'present' },
  checkIn:    { type: Date },
  checkOut:   { type: Date },
  tasksCompleted: { type: Number, default: 0 },
  note:       { type: String },
}, { timestamps: true });

// Ensure unique attendance per cleaner per day
attendanceSchema.index({ cleaner: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
