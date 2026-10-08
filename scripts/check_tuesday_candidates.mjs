import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetSNos = [328, 338, 354, 460, 461];

async function checkCandidates() {
  console.log('=== CHECKING CANDIDATES IN DATABASE ===');
  const schools = await prisma.school.findMany({
    where: { s_no: { in: targetSNos } },
    include: {
      visits: {
        where: { representative_id: 'KA-REP-01' }
      }
    }
  });

  for (const s of schools) {
    console.log(`\nS.No ${s.s_no}: "${s.school_name}" [${s.school_id}]`);
    console.log(`  Area: ${s.area} | Board: ${s.board} | Type: ${s.school_type}`);
    console.log(`  Classes: ${s.classes_available} | Recommended: ${s.recommended_programme}`);
    console.log(`  Contact: ${s.principal_name || s.contact_person || 'N/A'} | Phone: ${s.phone || s.contact_number || 'N/A'}`);
    console.log(`  Visited by Current User: ${s.visited_by_current_user}`);
    console.log(`  Visit Status: ${s.visit_status}`);
    console.log(`  Visits count: ${s.visits.length}`);
  }
}

checkCandidates().catch(console.error).finally(() => prisma.$disconnect());
