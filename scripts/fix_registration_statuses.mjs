import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRegistrationStatuses() {
  console.log('=== REMOVING ALL INVENTED REGISTRATION STATUSES ===\n');

  // Find all visits by Kalyan
  const visits = await prisma.schoolVisit.findMany({
    where: { representative_id: 'KA-REP-01' },
    include: { school: true }
  });

  console.log(`Found ${visits.length} visit records by Kalyan.`);

  for (const v of visits) {
    const isRevisit = v.visit_type === 'REVISIT';
    
    // Set outcome to clean "Visited" or "Revisit Completed" - NEVER "Registration Confirmed"
    await prisma.schoolVisit.update({
      where: { id: v.id },
      data: {
        outcome: isRevisit ? 'Revisit' : 'Visited',
        interest_level: 'Medium',
        registration_status: null,
        notes: isRevisit ? 'Field revisit completed' : 'Field visit completed'
      }
    });

    // Update School model visit_status to VISITED (never REGISTRATION)
    await prisma.school.update({
      where: { id: v.school_id },
      data: {
        visit_status: isRevisit ? 'REVISITED' : 'VISITED',
        notes: isRevisit ? 'Field revisit completed' : 'Field visit completed'
      }
    });
  }

  // Double check if any school anywhere in DB has visit_status = 'REGISTRATION'
  const registeredSchools = await prisma.school.findMany({
    where: { visit_status: 'REGISTRATION' }
  });

  if (registeredSchools.length > 0) {
    console.log(`Resetting ${registeredSchools.length} schools from REGISTRATION to VISITED...`);
    await prisma.school.updateMany({
      where: { visit_status: 'REGISTRATION' },
      data: { visit_status: 'VISITED' }
    });
  }

  console.log('\nVerification of all visited schools:');
  const visitedSchools = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    select: { s_no: true, school_name: true, visit_status: true }
  });

  for (const s of visitedSchools) {
    console.log(`  S.No ${s.s_no}: ${s.school_name} -> Status: ${s.visit_status}`);
  }

  console.log('\n✓ Successfully reset: NO schools marked as registered. All marked purely as Visited / Revisit.');
}

fixRegistrationStatuses().catch(console.error).finally(() => prisma.$disconnect());
