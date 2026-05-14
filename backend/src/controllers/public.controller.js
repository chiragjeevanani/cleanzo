import Society from '../models/Society.js';
import Lead from '../models/Lead.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * GET /api/public/societies/search
 * Query: q (name or area), pincode
 */
export const searchSocieties = asyncHandler(async (req, res) => {
  const { q, pincode } = req.query;
  const filter = { isActive: true };

  if (pincode) {
    filter.pincode = pincode.trim();
  } else if (q) {
    const trimmed = q.trim();
    filter.$or = [
      { name: { $regex: trimmed, $options: 'i' } },
      { area: { $regex: trimmed, $options: 'i' } }
    ];
  } else {
    return res.json({ success: true, societies: [] });
  }

  const societies = await Society.find(filter).select('name area city pincode isActive').limit(10).lean();
  res.json({ success: true, societies });
});

/**
 * GET /api/public/societies/active
 * Returns all active societies for registration dropdown
 */
export const listActiveSocieties = asyncHandler(async (req, res) => {
  const societies = await Society.find({ isActive: true }).select('name area city pincode').sort('name').lean();
  res.json({ success: true, societies });
});

/**
 * POST /api/public/leads
 * Captures interest from unserviceable areas
 */
export const captureLead = asyncHandler(async (req, res) => {
  const { name, phone, email, city, requestedArea, requestedSociety, pincode } = req.body;
  
  if (!name || !phone || !city) {
    throw new ApiError(400, 'Name, phone and city are required');
  }

  const lead = await Lead.create({
    name,
    phone,
    email,
    city,
    requestedArea,
    requestedSociety,
    pincode
  });

  res.status(201).json({ 
    success: true, 
    message: 'Thank you for your interest! We will notify you when we expand to your area.',
    leadId: lead._id 
  });
});

/**
 * GET /api/public/packages
 */
export const listActivePackages = asyncHandler(async (req, res) => {
  const { default: Package } = await import('../models/Package.js');
  const packages = await Package.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, packages });
});

/**
 * GET /api/public/products
 */
export const listProducts = asyncHandler(async (req, res) => {
  const { default: Product } = await import('../models/Product.js');
  const products = await Product.find({ isActive: true, stock: { $gt: 0 } }).sort('-createdAt');
  res.json({ success: true, products });
});

/**
 * GET /api/public/products/:id
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { default: Product } = await import('../models/Product.js');
  const product = await Product.findById(req.params.id);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');
  res.json({ success: true, product });
});
