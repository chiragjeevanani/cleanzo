import mongoose from 'mongoose';
import dotenv from 'dotenv';
import request from 'supertest';
import app from '../app.js';
import Customer from '../models/Customer.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Create or find a test customer
  let customer = await Customer.findOne({ email: 'testupload@example.com' });
  if (!customer) {
    customer = await Customer.create({
      firstName: 'Test',
      lastName: 'Upload',
      phone: '9999999999',
      email: 'testupload@example.com',
      city: 'Mumbai',
    });
  }

  const token = jwt.sign({ id: customer._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1x1 transparent pixel PNG buffer as a dummy file
  const buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  console.log('Sending multipart/form-data request to add vehicle...');
  const res = await request(app)
    .post('/api/customer/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .field('brand', 'Maruti')
    .field('model', 'Swift')
    .field('number', 'MH01AB1234')
    .field('flatNumber', '102')
    .field('blockTower', 'A')
    .field('slotPillar', '42')
    .field('category', 'sedan')
    .attach('photos', buffer, { filename: 'test.png', contentType: 'image/png' });

  console.log('Response Status:', res.status);
  console.log('Response Body:', res.body);

  await mongoose.disconnect();
};

run().catch(console.error);
