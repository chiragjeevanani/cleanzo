import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const check = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const vehiclesCollection = mongoose.connection.db.collection('vehicles');
  const indexes = await vehiclesCollection.indexes();
  console.log('Vehicles Indexes:', JSON.stringify(indexes, null, 2));

  // Count vehicles
  const count = await vehiclesCollection.countDocuments();
  console.log('Total vehicles in DB:', count);

  const samples = await vehiclesCollection.find({}).limit(5).toArray();
  console.log('Sample vehicles:', samples);

  await mongoose.disconnect();
};

check().catch(console.error);
