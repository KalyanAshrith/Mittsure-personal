const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCandidates() {
  const currentStops10 = [223, 414, 102, 198];
  
  // Find State / Pre-schools in Ramakrishna Nagar / Srirampura / Kuvempunagar
  const stateSchools = await prisma.school.findMany({
    where: {
      s_no: { notIn: currentStops10 },
      status: { not: 'VISITED' },
      visited_by_current_user: false,
      board: { in: ['STATE BOARD', 'OTHER', 'State Board', 'Other'] },
      area: { in: ['Ramakrishna Nagar', 'Srirampura', 'Kuvempunagar'] }
    },
    orderBy: { s_no: 'asc' },
    take: 10
  });

  console.log('--- State / Pre-School Candidates ---');
  stateSchools.forEach(s => console.log(s.s_no, '|', s.school_name, '|', s.board, '|', s.category, '|', s.area));

  // Find CBSE / ICSE schools in Ramakrishna Nagar / Srirampura / Kuvempunagar
  const cbseSchools = await prisma.school.findMany({
    where: {
      s_no: { notIn: currentStops10 },
      status: { not: 'VISITED' },
      visited_by_current_user: false,
      board: { in: ['CBSE', 'ICSE'] },
      area: { in: ['Ramakrishna Nagar', 'Srirampura', 'Kuvempunagar'] }
    },
    orderBy: { s_no: 'asc' },
    take: 10
  });

  console.log('\n--- CBSE / ICSE Candidates ---');
  cbseSchools.forEach(s => console.log(s.s_no, '|', s.school_name, '|', s.board, '|', s.category, '|', s.area));
}

findCandidates().catch(console.error).finally(() => prisma.$disconnect());
