import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    priceAtPurchase: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    line1: String,
    line2: String,
    city: String,
    pincode: String,
    phone: String
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Online'],
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Placed'
  },
  trackingId: String,
  courierPartner: String,
  cancelledAt: Date,
  cancellationReason: String,
  deliveredAt: Date
}, { timestamps: true });

// Generate unique order ID
orderSchema.pre('validate', async function(next) {
  if (!this.orderId) {
    const date = new Date();
    const prefix = 'CZ' + date.getFullYear().toString().slice(-2) + (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderId = `${prefix}-${random}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
