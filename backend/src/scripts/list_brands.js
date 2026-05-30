import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const brands = await mongoose.connection.db.collection('brands').find({}).toArray();
  console.log('Brands in DB:', JSON.stringify(brands, null, 2));
  await mongoose.disconnect();
};

run().catch(console.error);
