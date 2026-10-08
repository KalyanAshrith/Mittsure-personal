const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlreadyVisited() {
  const snos = [264, 224, 52, 474, 215, 243, 57, 203, 204, 77, 81, 147, 82, 282, 284, 87, 88, 317, 257, 242, 455, 246];
  for (const sNo of snos) {
    const s = await prisma.school.findUnique({
      where: { s_no: sNo },
      include: { visits: { where: { representative_id: 'KA-REP-01' } } }
    });
    console.log(`S.No ${s.s_no} | ${s.school_name} | visits: ${s.visits.length} | date: ${s.visits[0]?.visit_date?.toISOString().split('T')[0]} | outcome: ${s.visits[0]?.outcome}`);
  }
}

checkAlreadyVisited().catch(console.error).finally(() => prisma['$disconnect']());
