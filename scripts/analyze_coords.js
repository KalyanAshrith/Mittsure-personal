const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allSchools = await prisma.school.findMany({
    select: { s_no: true, school_name: true, area: true, latitude: true, longitude: true }
  });

  const baseCoordsSchools = allSchools.filter(s => {
    return Math.abs(s.latitude - 12.3021) < 0.005 && Math.abs(s.longitude - 76.6178) < 0.005;
  });

  console.log(`Total schools in DB: ${allSchools.length}`);
  console.log(`Schools with base/near-base coordinates (~12.3021, 76.6178): ${baseCoordsSchools.length}`);

  // Let's see some samples of schools with real coordinates vs base coordinates
  console.log('\nSample near-base schools:');
  baseCoordsSchools.slice(0, 10).forEach(s => {
    console.log(`  S.No ${s.s_no} - ${s.school_name} (${s.area}) [${s.latitude}, ${s.longitude}]`);
  });

  const realCoordsSchools = allSchools.filter(s => {
    return Math.abs(s.latitude - 12.3021) >= 0.005 || Math.abs(s.longitude - 76.6178) >= 0.005;
  });
  console.log(`\nSchools with distinct real coordinates: ${realCoordsSchools.length}`);
  console.log('Sample distinct real coordinates schools:');
  realCoordsSchools.slice(0, 10).forEach(s => {
    console.log(`  S.No ${s.s_no} - ${s.school_name} (${s.area}) [${s.latitude}, ${s.longitude}]`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
