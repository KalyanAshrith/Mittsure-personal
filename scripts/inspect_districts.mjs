import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectDistricts() {
  const districts = await prisma.school.groupBy({
    by: ['district'],
    _count: { id: true }
  });
  console.log('Districts breakdown:', districts);

  const chamarajanagarSchools = await prisma.school.findMany({
    where: {
      OR: [
        { district: { contains: 'Chamaraja' } },
        { area: { contains: 'Chamaraja' } },
        { taluk: { contains: 'Chamaraja' } },
        { address: { contains: 'Chamarajanagar' } }
      ]
    },
    select: {
      s_no: true,
      school_name: true,
      area: true,
      taluk: true,
      district: true,
      latitude: true,
      longitude: true,
      visit_status: true,
      visited_by_current_user: true
    }
  });

  console.log(`Chamarajanagar schools count: ${chamarajanagarSchools.length}`);
  chamarajanagarSchools.forEach(s => {
    console.log(`  #${s.s_no} ${s.school_name} | Area: ${s.area} | Taluk: ${s.taluk} | Dist: ${s.district} | Lat/Lng: ${s.latitude}, ${s.longitude} | Visited: ${s.visited_by_current_user}`);
  });
}

inspectDistricts().finally(() => prisma.$disconnect());
