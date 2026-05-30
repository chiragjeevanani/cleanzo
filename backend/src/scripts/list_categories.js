import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const categories = await mongoose.connection.db.collection('vehiclecategories').find({}).toArray();
  console.log('Vehicle Categories in DB:', categories);
  await mongoose.disconnect();
};

run().catch(console.error);
