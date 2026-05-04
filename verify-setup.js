#!/usr/bin/env node

import { config } from 'dotenv';
import prisma from './src/database/prisma.js';

config();

async function verifySetup() {
  console.log('🔍 Verifying Discord Bot Setup...\n');

  // Check environment variables
  console.log('📋 Checking environment variables...');
  const requiredEnvVars = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
    'DATABASE_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
  console.log('✅ All required environment variables are set\n');

  // Check database connection
  console.log('🗄️  Checking database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to database\n');

    // Test database query
    console.log('🔍 Testing database query...');
    const count = await prisma.guildConfig.count();
    console.log(`✅ Database query successful (${count} guild configs found)\n`);

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Make sure your DATABASE_URL is correct and Supabase is accessible');
    process.exit(1);
  }

  // Check Prisma client generation
  console.log('⚙️  Checking Prisma client...');
  try {
    const models = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
    console.log(`✅ Prisma client generated with models: ${models.join(', ')}\n`);
  } catch (error) {
    console.error('❌ Prisma client check failed');
    console.error('💡 Run: npm run db:generate\n');
    process.exit(1);
  }

  // Verify schema
  console.log('📊 Verifying database schema...');
  try {
    // Try to query each model
    await prisma.guildConfig.findFirst();
    await prisma.moderationLog.findFirst();
    await prisma.userWarning.findFirst();
    await prisma.warning.findFirst();
    console.log('✅ All database tables exist and are accessible\n');
  } catch (error) {
    console.error('❌ Schema verification failed:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Run: npm run db:push');
    process.exit(1);
  }

  console.log('✨ Setup verification complete! Your bot is ready to run.\n');
  console.log('🚀 Start the bot with: npm start');
  console.log('🔧 Or run in dev mode: npm run dev\n');

  await prisma.$disconnect();
  process.exit(0);
}

verifySetup().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
