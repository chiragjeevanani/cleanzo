import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  images: [{
    type: String,
    required: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['Microfiber Cloths', 'Waterless Wash', 'Interior Care', 'Exterior Polish', 'Perfumes', 'Kits', 'Other'],
    default: 'Other'
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specifications: [{
    label: String,
    value: String
  }]
}, { timestamps: true });

// Auto-deactivate if stock is 0 (optional logic, but better to keep isActive for manual control)
// productSchema.pre('save', function(next) {
//   if (this.stock === 0) this.isActive = false;
//   next();
// });

const Product = mongoose.model('Product', productSchema);
export default Product;
