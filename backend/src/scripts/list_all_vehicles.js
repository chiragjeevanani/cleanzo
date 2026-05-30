import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const vehicles = await mongoose.connection.db.collection('vehicles').find({}).toArray();
  console.log('All Vehicles in DB:', JSON.stringify(vehicles, null, 2));
  await mongoose.disconnect();
};

run().catch(console.error);
