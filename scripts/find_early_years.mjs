import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const names = [
  'My First School',
  'Nios Nest',
  'Pusthi',
  'Tiny Teddy',
  'Tiny Treasure'
];

async function findNames() {
  for (const n of names) {
    const found = await prisma.school.findMany({
      where: { school_name: { contains: n } }
    });
    console.log(`\nSearch "${n}": found ${found.length} matches:`);
    for (const f of found) {
      console.log(`  S.No ${f.s_no} | "${f.school_name}" [${f.school_id}] | Area: ${f.area} | Type: ${f.school_type}`);
    }
  }
}

findNames().catch(console.error).finally(() => prisma.$disconnect());
