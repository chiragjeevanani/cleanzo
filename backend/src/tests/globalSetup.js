import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-min!!';
  process.env.JWT_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.NODE_ENV = 'test';
  global.__MONGOD__ = mongod;
}

export async function teardown() {
  await global.__MONGOD__?.stop();
}
