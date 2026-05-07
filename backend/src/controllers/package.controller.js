import Package from '../models/Package.js';
import asyncHandler from '../utils/asyncHandler.js';

// Public: list active packages
export const getPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, packages });
});

// Public: get package by id
export const getPackageById = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
  res.json({ success: true, package: pkg });
});
