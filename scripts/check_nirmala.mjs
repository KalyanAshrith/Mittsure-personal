import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const s = await prisma.school.findFirst({
    where: { school_id: 'S-74732' }
  });
  console.log('Nirmala 209:', s.s_no, s.school_name, 'visited_by_current_user:', s.visited_by_current_user, 'visit_status:', s.visit_status);
}

check().finally(() => prisma.$disconnect());
