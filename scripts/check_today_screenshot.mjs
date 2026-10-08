import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const todaySchools = [
  { code: 'S-117035', name: 'Future Foundation School' },
  { code: 'S-131589', name: 'Lalitha High School' },
  { code: 'S-75441', name: 'Pragathi Vidya Kendra Bogadhi' },
  { code: 'S-21329', name: 'Sri Sharada Public School-830342' },
  { code: 'S-18149', name: 'Supreme Public School-Mysuru' },
  { code: 'S-141129', name: 'Vasavi Vidyanikethana' },
  { code: 'S-18155', name: 'Vidyavardhaka Sangha B M Sri Educational Instituti' }
];

async function checkTodaySchools() {
  console.log('Checking the 7 schools from today\'s screenshot:');
  for (const item of todaySchools) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.code },
          { school_code: item.code },
          { school_id: 'School-' + item.code }
        ]
      },
      include: {
        visits: {
          where: { is_current_representative: true }
        }
      }
    });

    if (!s) {
      console.log(`NOT FOUND: ${item.name} (${item.code})`);
    } else {
      console.log(`#${s.s_no} ${s.school_name} (${s.school_id}) | Area: ${s.area} | Dist: ${s.district} | Status: ${s.visit_status} | VisitedByUser: ${s.visited_by_current_user} | Visits count: ${s.visits.length}`);
      s.visits.forEach(v => {
        console.log(`   Visit on ${v.visit_date.toISOString().split('T')[0]}: ${v.outcome}`);
      });
    }
  }
}

checkTodaySchools().finally(() => prisma.$disconnect());
