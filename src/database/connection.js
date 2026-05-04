import prisma from './prisma.js';

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Prisma connected to Supabase successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected');
  } catch (error) {
    console.error('Database disconnection error:', error);
  }
}

process.on('beforeExit', async () => {
  await disconnectDatabase();
});
