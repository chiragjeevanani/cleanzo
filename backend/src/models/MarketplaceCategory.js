import mongoose from 'mongoose';

const marketplaceCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    default: 'Package'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const MarketplaceCategory = mongoose.model('MarketplaceCategory', marketplaceCategorySchema);
export default MarketplaceCategory;
