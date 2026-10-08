import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ids = ['S-156333', 'S-139929', 'S-163331', 'S-156504', 'S-162998'];

async function check() {
  const schools = await prisma.school.findMany({
    where: { school_id: { in: ids } }
  });
  console.log('Checking these 5 early-years schools:');
  for (const s of schools) {
    console.log(`S.No ${s.s_no} | ${s.school_name} | ${s.area} | Visited: ${s.visited_by_current_user} | ID: ${s.school_id}`);
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
