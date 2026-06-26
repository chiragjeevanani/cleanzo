import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import mammoth from 'mammoth';

import Admin from '../models/Admin.js';
import Package from '../models/Package.js';
import Brand from '../models/Brand.js';
import VehicleCategory from '../models/VehicleCategory.js';

dotenv.config();

const docsDir = path.join(process.cwd(), '../docs');

const seedAdmin = async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('❌ FATAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set. Refusing to seed admin.');
    process.exit(1);
  }
  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log('⏭  Superadmin already exists, skipping.');
  } else {
    await Admin.create({
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'superadmin',
    });
    console.log(`✅ Superadmin created: ${process.env.ADMIN_EMAIL}`);
  }
};

const parseCarDocxFeatures = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  // Split by the section headers
  const parts = text.split(/(?=🚗|⭐|👑)/);
  
  const parsePart = (partText) => {
    const lines = partText.split('\n').map(l => l.trim()).filter(Boolean);
    const includes = lines.filter(l => l.startsWith('✅')).map(l => l.substring(1).trim());
    const excludes = lines.filter(l => l.startsWith('❌')).map(l => l.substring(1).trim());
    return { includes, excludes };
  };
  
  const basicPart = parts.find(p => p.includes('Essential'));
  const stdPart = parts.find(p => p.includes('Plus'));
  const premPart = parts.find(p => p.includes('Elite'));
  
  return {
    Basic: parsePart(basicPart || ''),
    Standard: parsePart(stdPart || ''),
    Premium: parsePart(premPart || '')
  };
};

const parseBikeDocxFeatures = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const includes = lines.filter(l => l.startsWith('✅')).map(l => l.substring(1).trim());
  const excludes = lines.filter(l => l.startsWith('❌')).map(l => l.substring(1).trim());
  return { includes, excludes };
};

const seedData = async () => {
  console.log('📖 Parsing document files...');
  
  // 1. Parse Includes/Excludes
  const carPlansPath = path.join(docsDir, 'Cleanzo Car Care Plans.docx');
  const bikePlansPath = path.join(docsDir, 'Cleanzo Two-Wheeler Plans.docx');
  
  if (!fs.existsSync(carPlansPath)) {
    throw new Error(`Car plans doc not found at: ${carPlansPath}`);
  }
  if (!fs.existsSync(bikePlansPath)) {
    throw new Error(`Bike plans doc not found at: ${bikePlansPath}`);
  }
  
  const carFeatures = await parseCarDocxFeatures(carPlansPath);
  const bikeFeatures = await parseBikeDocxFeatures(bikePlansPath);
  
  // 2. Parse Excel
  const excelPath = path.join(docsDir, 'Cleanzo_Vehicle_Master_v1.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel master not found at: ${excelPath}`);
  }
  
  const workbook = xlsx.readFile(excelPath);
  
  // Parse Four Wheeler
  const sheet4W = workbook.Sheets['Four_Wheeler_Master'];
  const raw4W = xlsx.utils.sheet_to_json(sheet4W, { header: 1 });
  const cars = [];
  
  for (let i = 2; i < raw4W.length; i++) {
    const row = raw4W[i];
    if (!row || row.length === 0) continue;
    
    const brand = row[2]?.trim();
    const model = row[3]?.trim();
    const surfaceCategory = row[5]?.trim();
    const basicPrice = Number(row[7]);
    const standardPrice = Number(row[8]);
    const premiumPrice = Number(row[9]);
    const isActive = row[10] === 'Yes';
    
    if (!brand || !model || !surfaceCategory || isNaN(basicPrice)) continue;
    
    cars.push({
      brand,
      model,
      surfaceCategory,
      basicPrice,
      standardPrice,
      premiumPrice,
      isActive
    });
  }
  
  // Parse Two Wheeler
  const sheet2W = workbook.Sheets['Two_Wheeler_Master'];
  const raw2W = xlsx.utils.sheet_to_json(sheet2W, { header: 1 });
  const bikes = [];
  
  for (let i = 1; i < raw2W.length; i++) {
    const row = raw2W[i];
    if (!row || row.length === 0) continue;
    
    const brand = row[2]?.trim();
    const model = row[3]?.trim();
    const category = row[4]?.trim();
    const monthlyPrice = Number(row[6]);
    const isActive = row[7] === 'Yes';
    
    if (!brand || !model || !category || isNaN(monthlyPrice)) continue;
    
    bikes.push({
      brand,
      model,
      category,
      monthlyPrice,
      isActive
    });
  }
  
  console.log(`🧹 Clearing existing Brands, VehicleCategories, and Packages...`);
  await Brand.deleteMany({});
  await VehicleCategory.deleteMany({});
  await Package.deleteMany({});
  
  // 3. Seed Brand Collection
  console.log('🌱 Seeding Brands & Models...');
  const brandMap = new Map();
  
  for (const car of cars) {
    if (!car.isActive) continue;
    if (!brandMap.has(car.brand)) {
      brandMap.set(car.brand, new Set());
    }
    brandMap.get(car.brand).add(car.model);
  }
  
  for (const bike of bikes) {
    if (!bike.isActive) continue;
    if (!brandMap.has(bike.brand)) {
      brandMap.set(bike.brand, new Set());
    }
    brandMap.get(bike.brand).add(bike.model);
  }
  
  for (const [brandName, modelsSet] of brandMap.entries()) {
    await Brand.create({
      name: brandName,
      models: Array.from(modelsSet),
      isActive: true
    });
  }
  console.log(`✅ Seeded ${brandMap.size} brands into Database.`);
  
  // 4. Seed VehicleCategory Collection
  console.log('🌱 Seeding Vehicle Categories...');
  const CATEGORIES = [
    { name: 'Small', slug: 'small', description: 'Small Hatchbacks & Compact Cars', icon: 'car', sortOrder: 1 },
    { name: 'Medium', slug: 'medium', description: 'Sedans & Mid-sized Cars', icon: 'car', sortOrder: 2 },
    { name: 'Large', slug: 'large', description: 'SUVs & Large Cars', icon: 'car', sortOrder: 3 },
    { name: 'Premium Small', slug: 'premium_small', description: 'Premium Compact Cars', icon: 'car', sortOrder: 4 },
    { name: 'Premium Medium', slug: 'premium_medium', description: 'Premium Sedans & Medium Cars', icon: 'car', sortOrder: 5 },
    { name: 'Premium Large', slug: 'premium_large', description: 'Premium SUVs & Luxury Cars', icon: 'car', sortOrder: 6 },
    { name: 'Standard Bike', slug: 'standard_bike', description: 'Standard Scooters & Motorcycles', icon: 'bike', sortOrder: 7 },
    { name: 'Premium Bike', slug: 'premium_bike', description: 'Premium & Sports Bikes', icon: 'bike', sortOrder: 8 }
  ];
  await VehicleCategory.insertMany(CATEGORIES);
  console.log(`✅ Seeded ${CATEGORIES.length} vehicle categories.`);
  
  // Helper to construct applicableModels
  const constructApplicableModels = (vehicleList) => {
    const group = {};
    for (const v of vehicleList) {
      if (!group[v.brand]) {
        group[v.brand] = new Set();
      }
      group[v.brand].add(v.model);
    }
    return Object.entries(group).map(([brand, modelsSet]) => ({
      brand,
      models: Array.from(modelsSet)
    }));
  };
  
  // 5. Seed Package Collection (4-Wheelers)
  console.log('🌱 Seeding 4-Wheeler packages...');
  const carCats = ['Small', 'Medium', 'Large', 'Premium Small', 'Premium Medium', 'Premium Large'];
  
  for (const catName of carCats) {
    const catCars = cars.filter(c => c.surfaceCategory === catName && c.isActive);
    if (catCars.length === 0) continue;
    
    const slug = catName.toLowerCase().replace(' ', '_');
    const appModels = constructApplicableModels(catCars);
    
    const basicPrice = catCars[0].basicPrice;
    const standardPrice = catCars[0].standardPrice;
    const premiumPrice = catCars[0].premiumPrice;
    
    // Basic
    await Package.create({
      name: `Cleanzo Essential - ${catName}`,
      tier: 'Basic',
      price: basicPrice,
      trialPrice: 49,
      duration: 'Monthly',
      perDay: Math.round(basicPrice / 30),
      features: carFeatures.Basic.includes,
      excludedFeatures: carFeatures.Basic.excludes,
      category: slug,
      applicableModels: appModels,
      popular: false,
      isActive: true,
      showOnLanding: true,
      sortOrder: 1
    });
    
    // Standard
    await Package.create({
      name: `Cleanzo Plus - ${catName}`,
      tier: 'Standard',
      price: standardPrice,
      trialPrice: 49,
      duration: 'Monthly',
      perDay: Math.round(standardPrice / 30),
      features: carFeatures.Standard.includes,
      excludedFeatures: carFeatures.Standard.excludes,
      category: slug,
      applicableModels: appModels,
      popular: true,
      isActive: true,
      showOnLanding: true,
      sortOrder: 2
    });
    
    // Premium
    await Package.create({
      name: `Cleanzo Elite - ${catName}`,
      tier: 'Premium',
      price: premiumPrice,
      trialPrice: 49,
      duration: 'Monthly',
      perDay: Math.round(premiumPrice / 30),
      features: carFeatures.Premium.includes,
      excludedFeatures: carFeatures.Premium.excludes,
      category: slug,
      applicableModels: appModels,
      popular: false,
      isActive: true,
      showOnLanding: true,
      sortOrder: 3
    });
  }
  
  // 6. Seed Package Collection (2-Wheelers)
  console.log('🌱 Seeding 2-Wheeler packages...');
  const bikeCats = ['Standard', 'Premium'];
  
  for (const catName of bikeCats) {
    const catBikes = bikes.filter(b => b.category === catName && b.isActive);
    if (catBikes.length === 0) continue;
    
    const slug = `${catName.toLowerCase()}_bike`;
    const appModels = constructApplicableModels(catBikes);
    const price = catBikes[0].monthlyPrice;
    
    await Package.create({
      name: `Cleanzo Standard - ${catName === 'Standard' ? 'Standard Bike' : 'Premium Bike'}`,
      tier: 'Standard',
      price: price,
      trialPrice: 29,
      duration: 'Monthly',
      perDay: Math.round(price / 30),
      features: bikeFeatures.includes,
      excludedFeatures: bikeFeatures.excludes,
      category: slug,
      applicableModels: appModels,
      popular: false,
      isActive: true,
      showOnLanding: true,
      sortOrder: 1
    });
  }
  
  console.log('✅ Packages seeded.');
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🌱 Running seed script...');
    await seedAdmin();
    await seedData();
    console.log('🌱 Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seed();
