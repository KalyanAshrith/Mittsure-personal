import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.school.updateMany({
    where: {
      visited_by_current_user: true,
      NOT: { visit_status: 'VISITED' }
    },
    data: {
      visit_status: 'VISITED'
    }
  });
  console.log('Normalized visit_status to VISITED for', updated.count, 'schools');

  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  const allDbSchools = await prisma.school.findMany({ orderBy: { s_no: 'asc' } });
  fs.writeFileSync(schoolsJsonPath, JSON.stringify(allDbSchools, null, 2), 'utf-8');

  const byCurrent = await prisma.school.count({ where: { visited_by_current_user: true } });
  const byStatus = await prisma.school.count({ where: { visit_status: 'VISITED' } });
  console.log('Verified counts -> byCurrent:', byCurrent, 'byStatus:', byStatus);
}

main().catch(console.error).finally(() => prisma.$disconnect());
