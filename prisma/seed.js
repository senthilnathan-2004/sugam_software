const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Sugam HMS database...');

  // 1. Initial settings
  const defaultSettings = [
    { key: 'hospital_name', value: 'Sugam General Hospital', type: 'STRING' },
    { key: 'hospital_phone', value: '+91 98765 43210', type: 'STRING' },
    { key: 'hospital_address', value: '123, Healthcare Avenue, Chennai, TN 600001', type: 'STRING' },
    { key: 'gst_number', value: '33AABCU9603R1ZM', type: 'STRING' },
    { key: 'currency', value: 'INR', type: 'STRING' },
    { key: 'backup_frequency', value: 'DAILY', type: 'STRING' },
    { key: 'backup_retention', value: '10', type: 'STRING' },
    { key: 'backup_dir', value: './backups', type: 'STRING' },
  ];

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // 2. Initial Users
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const doctorHash = await bcrypt.hash('Doctor@123', 12);
  const billingHash = await bcrypt.hash('Billing@123', 12);
  const receptionHash = await bcrypt.hash('Reception@123', 12);

  const admin = await prisma.user.upsert({
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

  const docUser = await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  // Create associated Doctor profile
  await prisma.doctor.upsert({
    where: { userId: docUser.id },
    update: {},
    create: {
      userId: docUser.id,
      specialization: 'General Physician',
      license: 'REG-1001',
      qualification: 'MBBS, MD',
      schedule: '{}',
    },
  });

  console.log('Seeding completed successfully.');
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
    await prisma.$disconnect();
  });
