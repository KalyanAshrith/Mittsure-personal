const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncDailySummaries() {
  const allVisits = await prisma.schoolVisit.findMany({
    where: { is_current_representative: true }
  });

  // Group visits by date YYYY-MM-DD
  const visitsByDate = {};
  for (const v of allVisits) {
    const dStr = v.visit_date.toISOString().split('T')[0];
    if (!visitsByDate[dStr]) {
      visitsByDate[dStr] = { total: 0, firstVisits: 0, revisits: 0, interested: 0, registrations: 0 };
    }
    visitsByDate[dStr].total++;
    if (v.visit_type === 'REVISIT') visitsByDate[dStr].revisits++;
    else visitsByDate[dStr].firstVisits++;

    if (v.outcome === 'Registration Confirmed') visitsByDate[dStr].registrations++;
    else visitsByDate[dStr].interested++;
  }

  console.log('Visits breakdown by date:', visitsByDate);

  for (const [dStr, counts] of Object.entries(visitsByDate)) {
    const existing = await prisma.dailySummary.findUnique({ where: { date: dStr } });
    if (existing) {
      await prisma.dailySummary.update({
        where: { date: dStr },
        data: {
          schools_visited: counts.firstVisits,
          revisits: counts.revisits,
          interested: counts.interested,
          registrations: counts.registrations
        }
      });
      console.log(`Updated DailySummary for ${dStr}: ${counts.firstVisits} visited, ${counts.revisits} revisits`);
    } else {
      await prisma.dailySummary.create({
        data: {
          date: dStr,
          schools_planned: counts.total,
          schools_visited: counts.firstVisits,
          revisits: counts.revisits,
          interested: counts.interested,
          registrations: counts.registrations,
          remarks: `Summary synced: ${counts.total} visits logged.`
        }
      });
      console.log(`Created DailySummary for ${dStr}: ${counts.firstVisits} visited, ${counts.revisits} revisits`);
    }
  }
}

syncDailySummaries().catch(console.error).finally(() => prisma['$disconnect']());
