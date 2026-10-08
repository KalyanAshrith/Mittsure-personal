const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueFollowUps = await prisma.followUp.findMany({
    where: {
      due_date: { lt: today },
      status: { not: 'Completed' }
    },
    include: {
      school: {
        include: {
          visits: { orderBy: { visit_date: 'desc' } }
        }
      },
      visit: true
    },
    orderBy: { due_date: 'asc' }
  });

  console.log(`Found ${overdueFollowUps.length} overdue follow-up records:`);
  for (const f of overdueFollowUps) {
    const s = f.school;
    console.log(`----------------------------------------`);
    console.log(`S.No #${s.s_no} | ${s.school_name} (${s.school_id})`);
    console.log(`  Area: ${s.area} | Board: ${s.board} | Category: ${s.category}`);
    console.log(`  Coordinates: (${s.latitude}, ${s.longitude})`);
    console.log(`  Due Date: ${f.due_date?.toISOString().split('T')[0]} | Due Time: ${f.due_time} | Priority: ${f.priority}`);
    console.log(`  FollowUp Notes: ${f.notes}`);
    console.log(`  Contact: ${f.contact_person} (${f.contact_number})`);
    console.log(`  Total School Visits in DB: ${s.visits.length}`);
    if (s.visits.length > 0) {
      const lv = s.visits[0];
      console.log(`  Last Visit: ${lv.visit_date.toISOString().split('T')[0]} | Rep: ${lv.representative} | Outcome: ${lv.outcome} | Discussion: ${lv.programme_discussed}`);
    }
  }
}

main().catch(console.error).finally(() => prisma['$disconnect']());
