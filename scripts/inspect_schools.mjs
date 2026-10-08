import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const snos = [457, 349, 258, 191, 229, 347, 355, 211, 367, 342, 201, 223, 260, 263, 350, 396, 445, 181, 187, 366, 331, 360, 365, 368, 382];

async function check() {
  const schools = await prisma.school.findMany({
    where: { s_no: { in: snos } },
    select: { s_no: true, school_name: true, area: true, school_id: true }
  });
  schools.sort((a,b) => a.s_no - b.s_no);
  for (const s of schools) {
    console.log(`${s.s_no} -> ${s.school_name} (${s.area}) [${s.school_id}]`);
  }
}
check().catch(console.error).finally(() => prisma.$disconnect());
