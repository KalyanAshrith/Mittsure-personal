import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const visits = await prisma.schoolVisit.findMany({
    orderBy: { visit_date: 'desc' },
    take: 15,
    include: { school: { select: { s_no: true, school_name: true, school_id: true } } }
  });
  console.log('Most recent visits:');
  visits.forEach(v => {
    console.log(`${v.visit_date.toISOString()} | #${v.school?.s_no} ${v.school?.school_name} (${v.school?.school_id}) | ${v.outcome}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
