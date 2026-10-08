const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchAll() {
  const queries = [
    'DGTM',
    'S-116933',
    'JSS School Saraswathipuram',
    'S-125355',
    'Christ The King',
    'S-18094',
    'JSS Public School',
    'S-17802',
    'Super Kidz',
    'S-143362',
    'Vishwamanava',
    'S-76584',
    'Ramakrishna Vidya Kendra',
    'Sri Ranga Gurukula',
    'Tree Top',
    'Supreme Public School',
    'Akshara Path',
    'Amrita Vidyalayam',
    'Rotary West',
    'Royale Concord',
    'Sharada Vidya Samsthe',
    'Metagere',
    'Intelligent Public School',
    'Mysore Public School',
    'Purna Chetana',
    'Gungralchatra'
  ];

  for (const q of queries) {
    const res = await prisma.school.findMany({
      where: {
        OR: [
          { school_name: { contains: q } },
          { school_id: { contains: q } },
          { address: { contains: q } }
        ]
      },
      select: {
        id: true,
        s_no: true,
        school_id: true,
        school_name: true,
        board: true,
        area: true,
        visited_by_current_user: true,
        visit_status: true
      }
    });
    console.log(`\n--- Query: "${q}" (${res.length} matches) ---`);
    for (const r of res) {
      console.log(`  S.No: ${r.s_no} | ID: ${r.school_id} | Name: "${r.school_name}" | Area: ${r.area} | Visited: ${r.visited_by_current_user} (${r.visit_status})`);
    }
  }
}

searchAll().catch(console.error).finally(() => prisma['$disconnect']());
