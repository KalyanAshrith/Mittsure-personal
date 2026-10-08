import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKuvempu() {
  const excluded = [
    52, 57, 67, 86, 87, 97, 107, 114, 117, 124, 137, 144, 160, 164, 172, 177, 185, 192, 197, 204, 214, 234,
    75, 81, 88, 100, 118, 201, 221,
    55, 77, 101, 143, 207, 208, 209
  ];

  const schools = await prisma.school.findMany({
    where: {
      s_no: { notIn: excluded },
      visited_by_current_user: false,
      OR: [
        { area: { in: ['Kuvempunagar', 'Saraswathipuram', 'Sharadadevi Nagar', 'Bogadi', 'TK Layout'] } },
        { school_name: { contains: 'Kuvempu' } },
        { school_name: { contains: 'Saraswathi' } },
        { address: { contains: 'Kuvempunagar' } },
        { address: { contains: 'Saraswathipuram' } },
      ],
    },
    orderBy: { s_no: 'asc' },
  });

  console.log(`Found ${schools.length} Kuvempunagar/Saraswathipuram/Bogadi unvisited schools:`);
  schools.forEach(s => console.log(`  S.No. ${s.s_no} • ${s.school_name} (${s.area}) • Address: ${s.address.slice(0, 50)}`));

  await prisma.$disconnect();
}

checkKuvempu().catch(console.error);
