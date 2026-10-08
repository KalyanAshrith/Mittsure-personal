const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      s_no: true,
      school_name: true,
      area: true,
      address: true,
      district: true,
      visited_by_current_user: true,
      visit_status: true
    }
  });

  const areaCounts = {};
  for (const s of schools) {
    const area = (s.area || 'Other / Unknown').trim();
    if (!areaCounts[area]) {
      areaCounts[area] = { total: 0, visited: 0, unvisited: 0, schools: [] };
    }
    areaCounts[area].total++;
    if (s.visited_by_current_user || s.visit_status === 'VISITED') {
      areaCounts[area].visited++;
    } else {
      areaCounts[area].unvisited++;
    }
    areaCounts[area].schools.push(s);
  }

  const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1].total - a[1].total);

  console.log(`Total distinct areas in DB: ${sortedAreas.length}`);
  console.log('\nTop Areas:');
  sortedAreas.forEach(([area, stats]) => {
    console.log(`  ${area}: Total = ${stats.total} | Visited = ${stats.visited} | Unvisited = ${stats.unvisited}`);
  });

  // Check how many schools have "Nagar" in their name, area, or address
  const nagarSchools = schools.filter(s => {
    const text = `${s.area} ${s.address} ${s.school_name}`.toLowerCase();
    return text.includes('nagar') || text.includes('layout') || text.includes('pura') || text.includes('puram');
  });
  console.log(`\nSchools with Nagar / Pura / Puram / Layout: ${nagarSchools.length} out of ${schools.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
