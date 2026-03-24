import * as path from 'path';
import { config } from 'dotenv';

// Load .env from current working directory (backend/) when you run "npm run seed:run"
const envPath = path.join(process.cwd(), '.env');
const loaded = config({ path: envPath });
if (!loaded.parsed?.DB_PASSWORD && !process.env.DB_PASSWORD) {
  config({ path: path.join(__dirname, '../../../.env') });
}
console.log('DB user:', process.env.DB_USERNAME || 'postgres', '| password set:', !!process.env.DB_PASSWORD);

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Store } from '../entities/store.entity';
import { Category } from '../entities/category.entity';
import { Color } from '../entities/color.entity';
import { Dimension, DimensionUnit } from '../entities/dimension.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'carpet_platform',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: true, // create tables if they don't exist (dev only)
});

async function runSeed() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const storeRepo = dataSource.getRepository(Store);
  const categoryRepo = dataSource.getRepository(Category);
  const colorRepo = dataSource.getRepository(Color);
  const dimensionRepo = dataSource.getRepository(Dimension);

  const existing = await userRepo.findOne({ where: { email: 'manager@example.com' } });
  if (existing) {
    console.log('Seed already applied.');
    await dataSource.destroy();
    return;
  }

  const store = storeRepo.create({
    name: 'Main Store',
    code: 'MAIN-001',
    address: '123 Carpet Ave',
    city: 'New York',
    country: 'USA',
    isActive: true,
  });
  await storeRepo.save(store);

  const passwordHash = await bcrypt.hash('Manager123!', 12);
  const manager = userRepo.create({
    email: 'manager@example.com',
    passwordHash,
    firstName: 'Admin',
    lastName: 'Manager',
    role: UserRole.MANAGER,
    storeId: null,
    isActive: true,
  });
  await userRepo.save(manager);

  const worker = userRepo.create({
    email: 'worker@example.com',
    passwordHash: await bcrypt.hash('Worker123!', 12),
    firstName: 'Store',
    lastName: 'Worker',
    role: UserRole.STORE_WORKER,
    storeId: store.id,
    isActive: true,
  });
  await userRepo.save(worker);

  const cat = categoryRepo.create({
    name: 'Persian Carpets',
    slug: 'persian-carpets',
    displayOrder: 0,
    isActive: true,
  });
  await categoryRepo.save(cat);

  await colorRepo.save([
    colorRepo.create({ name: 'Crimson Red', colorCode: 'CR-001', hexValue: '#DC143C' }),
    colorRepo.create({ name: 'Navy Blue', colorCode: 'BL-002', hexValue: '#000080' }),
  ]);

  const dim1 = dimensionRepo.create({
    width: '2',
    length: '3',
    unit: DimensionUnit.METERS,
    displayName: '2m x 3m',
  });
  const dim2 = dimensionRepo.create({
    width: '3',
    length: '4',
    unit: DimensionUnit.METERS,
    displayName: '3m x 4m',
  });
  await dimensionRepo.save([dim1, dim2]);

  console.log('Seed completed. manager@example.com / Manager123!');
  await dataSource.destroy();
}

runSeed().catch((e) => {
  console.error(e);
  process.exit(1);
});
