import mongoose from 'mongoose';
const { Schema } = mongoose;

const grievanceSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  issue: { type: String, required: true, trim: true },
  attachment: { type: String }, // Cloudinary URL
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  adminNotes: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('Grievance', grievanceSchema);
