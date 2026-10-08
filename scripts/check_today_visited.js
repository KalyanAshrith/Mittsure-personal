const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const crmIds = ['S-74703', 'S-34598', 'S-156402', 'S-18108', 'S-156401', 'S-80189', 'S-75329'];
  const fullIds = crmIds.concat(crmIds.map(id => 'School-' + id));

  console.log('--- LOOKING UP SCHOOLS BY CRM ID ---');
  const schools = await prisma.school.findMany({
    where: {
      school_id: { in: fullIds }
    }
  });

  console.log('Found ' + schools.length + ' schools:');
  schools.forEach(s => {
    console.log('S.No ' + s.s_no + ' | ' + s.school_id + ' | ' + s.school_name + ' | VisitedByUser: ' + s.visited_by_current_user + ' | Status: ' + s.visit_status + ' | Area: ' + s.area);
  });

  // Also search by name if any were not found by ID
  const foundCrmIds = schools.map(s => s.school_id.replace('School-', ''));
  const missing = crmIds.filter(id => !foundCrmIds.includes(id));
  if (missing.length > 0) {
    console.log('Missing IDs:', missing);
  }

  // Check today route plan (2026-09-18 or 2026-09-17)
  console.log('\n--- CHECKING ROUTE PLANS AROUND TODAY ---');
  const routes = await prisma.routePlan.findMany({
    where: {
      date: { in: ['2026-09-17', '2026-09-18'] }
    },
    include: {
      stops: {
        include: {
          school: true
        }
      }
    }
  });

  routes.forEach(r => {
    console.log('Route Date: ' + r.date + ' | Name: ' + r.name);
    r.stops.forEach(st => {
      console.log('  Stop #' + st.optimized_sequence + ': S.No ' + st.school.s_no + ' - ' + st.school.school_name + ' (' + st.school.school_id + ') | StopStatus: ' + st.status + ' | VisitedByUser: ' + st.school.visited_by_current_user);
    });
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
