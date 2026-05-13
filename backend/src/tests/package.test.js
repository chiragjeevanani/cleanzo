import { describe, it, expect } from 'vitest';
import { api } from './helpers.js';
import Package from '../models/Package.js';

// ─── PUBLIC PACKAGE ROUTES ────────────────────────────────────────────────────
// GET /api/packages and GET /api/packages/:id require no auth (public)

describe('PKG-1 | GET /packages — public listing', () => {
  it('returns only active packages sorted by sortOrder', async () => {
    await Package.create({ name: 'Basic', tier: 'basic', price: 299, category: 'hatchback', features: ['Wash'], sortOrder: 2, isActive: true });
    await Package.create({ name: 'Standard', tier: 'standard', price: 399, category: 'hatchback', features: ['Wash', 'Polish'], sortOrder: 1, isActive: true });
    await Package.create({ name: 'Hidden', tier: 'premium', price: 699, category: 'hatchback', features: [], sortOrder: 3, isActive: false });

    const res = await api.get('/api/packages');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.packages)).toBe(true);
    // Only active packages returned
    expect(res.body.packages.every(p => p.isActive !== false)).toBe(true);
    // Hidden (isActive: false) should not appear
    expect(res.body.packages.find(p => p.name === 'Hidden')).toBeUndefined();
    // 2 active packages
    expect(res.body.packages.length).toBe(2);
    // Sorted by sortOrder ascending (Standard first, then Basic)
    expect(res.body.packages[0].name).toBe('Standard');
    expect(res.body.packages[1].name).toBe('Basic');
  });

  it('returns empty array when no packages exist', async () => {
    const res = await api.get('/api/packages');
    expect(res.status).toBe(200);
    expect(res.body.packages).toEqual([]);
  });
});

describe('PKG-2 | GET /packages/:id — single package', () => {
  it('returns a package by ID', async () => {
    const pkg = await Package.create({ name: 'Solo', tier: 'basic', price: 199, category: 'scooty', features: ['Wash'], isActive: true });

    const res = await api.get(`/api/packages/${pkg._id}`);
    expect(res.status).toBe(200);
    expect(res.body.package._id).toBe(pkg._id.toString());
    expect(res.body.package.name).toBe('Solo');
  });

  it('returns 404 for an unknown package ID', async () => {
    const { default: mongoose } = await import('mongoose');
    const res = await api.get(`/api/packages/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});
