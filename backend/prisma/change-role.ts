import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] || 'USER';

  if (!email) {
    console.log('Usage: npx ts-node prisma/change-role.ts <email> [role]');
    console.log('Example: npx ts-node prisma/change-role.ts user@example.com USER');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role },
  });

  console.log(`✅ Updated user ${email}:`);
  console.log(`   Role: ${user.role} → ${updated.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
