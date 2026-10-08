import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixLatestVisitDates() {
  const schools = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    include: {
      visits: {
        where: { is_current_representative: true },
        orderBy: { visit_date: 'desc' }
      }
    }
  });

  let fixed = 0;
  for (const s of schools) {
    if (s.visits.length > 0) {
      const latest = s.visits[0].visit_date;
      if (!s.last_visit_date || s.last_visit_date.getTime() !== latest.getTime()) {
        await prisma.school.update({
          where: { id: s.id },
          data: { last_visit_date: latest }
        });
        fixed++;
      }
    }
  }

  console.log(`Updated last_visit_date for ${fixed} schools.`);
}

fixLatestVisitDates().finally(() => prisma.$disconnect());
