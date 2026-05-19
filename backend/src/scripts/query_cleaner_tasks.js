import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cleaner from '../models/Cleaner.js';
import Task from '../models/Task.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const cleaner = await Cleaner.findOne({ phone: '9000000001' }); // cleaner phone number or whichever cleaner
    if (!cleaner) {
      const allCleaners = await Cleaner.find();
      console.log('All cleaners:', allCleaners.map(c => ({ id: c._id, name: c.name, phone: c.phone, totalCompleted: c.totalCompleted, completionRate: c.completionRate })));
      process.exit(0);
    }
    
    console.log('Cleaner:', {
      id: cleaner._id,
      name: cleaner.name,
      totalCompleted: cleaner.totalCompleted,
      completionRate: cleaner.completionRate
    });
    
    const tasks = await Task.find({ cleaner: cleaner._id });
    console.log(`Tasks count: ${tasks.length}`);
    console.log('Tasks statuses:', tasks.map(t => ({ id: t._id, date: t.date, status: t.status })));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
