import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function generateReport() {
  const visitedSchools = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    orderBy: [
      { last_visit_date: 'desc' },
      { s_no: 'asc' }
    ],
    include: {
      visits: {
        where: { is_current_representative: true },
        orderBy: { visit_date: 'desc' }
      }
    }
  });

  console.log(`Retrieved ${visitedSchools.length} visited schools.`);

  const rows = visitedSchools.map((s, idx) => {
    const latestVisit = s.visits[0];
    const visitDateStr = latestVisit?.visit_date
      ? latestVisit.visit_date.toISOString().split('T')[0]
      : s.last_visit_date
      ? s.last_visit_date.toISOString().split('T')[0]
      : 'N/A';

    return {
      index: idx + 1,
      s_no: s.s_no,
      party_id: s.school_id,
      school_name: s.school_name,
      area: s.area,
      board: s.board,
      type: s.school_type,
      visit_date: visitDateStr,
      visit_count: s.visits.length,
      outcome: latestVisit?.outcome || 'Interested'
    };
  });

  const reportData = {
    generated_at: new Date().toISOString(),
    total_assigned: 494,
    unique_visited_count: visitedSchools.length,
    unvisited_count: 494 - visitedSchools.length,
    completion_rate: `${((visitedSchools.length / 494) * 100).toFixed(2)}%`,
    schools: rows
  };

  const outputPath = path.resolve(process.cwd(), 'data/crm_135_visited_master_report.json');
  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf-8');
  console.log(`Saved master report JSON to ${outputPath}`);

  // Summary by date
  const dateCounts = {};
  rows.forEach(r => {
    dateCounts[r.visit_date] = (dateCounts[r.visit_date] || 0) + 1;
  });

  console.log('\nVisits breakdown by latest visit date:');
  Object.keys(dateCounts).sort().reverse().forEach(d => {
    console.log(`  ${d}: ${dateCounts[d]} schools`);
  });
}

generateReport().catch(console.error).finally(() => prisma.$disconnect());
