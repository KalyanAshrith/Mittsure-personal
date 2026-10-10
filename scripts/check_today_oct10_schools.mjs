import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetSchools = [
  { partyId: 'S-17803', name: 'M.C.S Public School-Chamarajanagara', opp: 'B+' },
  { partyId: 'S-141383', name: 'Seva Bharathi Nursery School Chamarjanagara', opp: 'A' },
  { partyId: 'S-140157', name: 'St Joseph School Chamarajanagara', opp: 'B' },
  { partyId: 'S-18484', name: 'St. Francis Icse School-Chamarajanagara', opp: 'C' },
  { partyId: 'S-174787', name: 'Universe English school Chamarajanagara', opp: 'B+' },
];

async function main() {
  for (const t of targetSchools) {
    let found = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: t.partyId },
          { school_name: { contains: t.name.split(' ')[0] } }
        ]
      }
    });
    const exactId = await prisma.school.findUnique({ where: { school_id: t.partyId } });
    if (exactId) found = exactId;
    console.log(t.partyId, t.name, '->', found ? `Found #${found.s_no} (${found.school_id}): ${found.school_name} | Area: ${found.area} | Visited: ${found.visit_status}` : 'NOT FOUND');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
