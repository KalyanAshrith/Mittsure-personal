import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const names = [
  'Taralabalu',
  'Pragathi Vidya Kendra',
  'Gangotri',
  'Amrita',
  'Christ Public',
  'Pragathi Elite',
  'Rainbow',
  'Bharatiya Vidya Bhavan',
  'S.V.E.I',
  'NPS International',
  'Basil Buds',
  'Cauvery',
  'Gnana Ganga',
  'Gokula',
  'Pramati',
  'Sharada Public',
  'Subhodaya',
  'Ace Priyadarshini',
  'Akshara Pathshala',
  'Royale Concord',
  'Mysore West Lions',
  'Rotary Mysore',
  'Rotary West',
  'Sadvidya',
  'Sharada Vilas'
];

async function check() {
  for (const n of names) {
    const found = await prisma.school.findMany({
      where: { school_name: { contains: n } },
      select: { s_no: true, school_name: true, area: true, school_id: true, visited_by_current_user: true }
    });
    console.log(`Query: "${n}" => found ${found.length} matches:`);
    for (const f of found) {
      console.log(`   S.No ${f.s_no} | ${f.school_name} | Area: ${f.area} | Visited: ${f.visited_by_current_user}`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
