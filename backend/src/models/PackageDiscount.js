import mongoose from 'mongoose';
const { Schema } = mongoose;

const packageDiscountSchema = new Schema({
  package: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  brand:   { type: String, required: true },
  model:   { type: String, default: '' },   // '' = applies to all models of the brand
  percent: { type: Number, required: true, min: 0, max: 100 },
  note:    { type: String, default: '' },
  isActive:{ type: Boolean, default: true },
}, { timestamps: true });

// One discount per package + brand + model combination
packageDiscountSchema.index({ package: 1, brand: 1, model: 1 }, { unique: true });

export default mongoose.model('PackageDiscount', packageDiscountSchema);
