import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const seedPrisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed App Settings
  const settings = [
    { key: 'hospital_name', value: 'Sugam General Hospital', type: 'STRING' },
    { key: 'hospital_phone', value: '+91 98765 43210', type: 'STRING' },
    { key: 'hospital_address', value: '123, Healthcare Avenue, Chennai, TN 600001', type: 'STRING' },
    { key: 'gst_number', value: '33AABCU9603R1ZM', type: 'STRING' },
    { key: 'currency', value: 'INR', type: 'STRING' },
    { key: 'gst_slab_1', value: '5', type: 'NUMBER' },
    { key: 'gst_slab_2', value: '12', type: 'NUMBER' },
    { key: 'gst_slab_3', value: '18', type: 'NUMBER' },
  ];

  for (const s of settings) {
    await seedPrisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // Seed Admin User — password: Admin@123
  const adminHash = await bcrypt.hash('Admin@123', 12);
  await seedPrisma.user.upsert({
    where: { email: 'admin@sugamhms.com' },
    update: { passwordHash: adminHash },
    create: {
      name: 'HMS Admin',
      email: 'admin@sugamhms.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Seed Doctor User — password: Doctor@123
  const doctorHash = await bcrypt.hash('Doctor@123', 12);
  await seedPrisma.user.upsert({
    where: { email: 'doctor@sugamhms.com' },
    update: { passwordHash: doctorHash },
    create: {
      name: 'Dr. Anjali Verma',
      email: 'doctor@sugamhms.com',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      isActive: true,
    },
  });

  // Seed Billing User — password: Billing@123
  const billingHash = await bcrypt.hash('Billing@123', 12);
  await seedPrisma.user.upsert({
    where: { email: 'billing@sugamhms.com' },
    update: { passwordHash: billingHash },
    create: {
      name: 'Rahul Sharma',
      email: 'billing@sugamhms.com',
      passwordHash: billingHash,
      role: 'BILLING',
      isActive: true,
    },
  });

  // Seed Reception User — password: Reception@123
  const receptionHash = await bcrypt.hash('Reception@123', 12);
  await seedPrisma.user.upsert({
    where: { email: 'reception@sugamhms.com' },
    update: { passwordHash: receptionHash },
    create: {
      name: 'Priya Patel',
      email: 'reception@sugamhms.com',
      passwordHash: receptionHash,
      role: 'RECEPTION',
      isActive: true,
    },
  });

  console.log('✅ Database seeding complete.');
  console.log('   Admin:     admin@sugamhms.com / Admin@123');
  console.log('   Doctor:    doctor@sugamhms.com / Doctor@123');
  console.log('   Billing:   billing@sugamhms.com / Billing@123');
  console.log('   Reception: reception@sugamhms.com / Reception@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await seedPrisma.$disconnect();
  });
