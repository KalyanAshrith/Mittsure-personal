const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const followups = await prisma.followUp.findMany({
    include: {
      school: true
    },
    orderBy: {
      due_date: 'asc'
    }
  });

  console.log(`Found ${followups.length} follow-ups in database:`);
  for (const f of followups) {
    const v = f.school?.visited_by_current_user ? '⚠️ VISITED' : '✅ Unvisited';
    console.log(`  ID: ${f.id} | Due: ${f.due_date} | Status: ${f.status} | Priority: ${f.priority} | S.No: ${f.school?.s_no} - ${f.school?.school_name} (${f.school?.board}, ${f.school?.area}) [${v}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
