import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const crmEntries = [
  // 3 Sep
  { code: 'S-18118', name: 'NPS International School-Mysuru', date: '2026-09-03' },
  { code: 'S-18126', name: 'S.V.E.I. School-Mysuru', date: '2026-09-03' },
  { code: 'S-75024', name: 'Bharatiya Vidya Bhavan School Vijayanagar', date: '2026-09-03' },
  { code: 'S-76615', name: 'Taralabalu School', date: '2026-09-03' },
  { code: 'S-75441', name: 'Pragathi Vidya Kendra Bogadhi', date: '2026-09-03' },
  { code: 'S-122455', name: 'Gangotri Public School', date: '2026-09-03' },
  { code: 'S-18088', name: 'Amrita Vidyalayam-Mysuru', date: '2026-09-03' },
  { code: 'S-18670', name: 'Pragathi Elite Public School-Mysuru', date: '2026-09-03' },
  { code: 'S-18093', name: 'Christ Public School-Mysuru', date: '2026-09-03' },
  { code: 'S-18123', name: 'Rainbow Public School-Mysuru', date: '2026-09-03' },

  // 4 Sep
  { code: 'S-148141', name: 'Subhodaya School Kuvrmpunagar', date: '2026-09-04' },
  { code: 'S-76259', name: 'Shri Sharada Public School', date: '2026-09-04' },
  { code: 'S-171432', name: 'Kidzee Pre School', date: '2026-09-04' },
  { code: 'S-74696', name: 'Gnana Ganga School', date: '2026-09-04' },
  { code: 'S-18119', name: 'Pramati Hill View Academy-Mysuru', date: '2026-09-04' },
  { code: 'S-156404', name: 'Basil Buds International School', date: '2026-09-04' },

  // 5 Sep
  { code: 'S-131608', name: 'SVEI CBSE School', date: '2026-09-05' },
  { code: 'S-18114', name: 'Mysore West Lions Sevaniketan School-Mysuru', date: '2026-09-05' },
  { code: 'S-75434', name: 'Akshara Pathsala', date: '2026-09-05' },
  { code: 'S-18719', name: 'Nypunya School Of Excellence-Mysuru', date: '2026-09-05' },
  { code: 'S-18113', name: 'Mysore International School-Mysuru', date: '2026-09-05' },
  { code: 'S-117035', name: 'Future Foundation School', date: '2026-09-05' },
  { code: 'S-113523', name: 'Sudarshan School', date: '2026-09-05' },

  // 6 Sep
  { code: 'S-18152', name: 'Thirumala Public School-Mysuru', date: '2026-09-06' },
  { code: 'S-155271', name: 'Floriana School T Narasipura', date: '2026-09-06' },
  { code: 'S-145315', name: 'Vasavi School T Narsipura', date: '2026-09-06' },
  { code: 'S-18148', name: 'St. Norbert School-Mysuru', date: '2026-09-06' },
  { code: 'S-125594', name: 'Shiksha School', date: '2026-09-06' },

  // 7 Oct
  { code: 'S-18090', name: 'Balodyana English School-Mysuru', date: '2026-10-07' },
  { code: 'S-143894', name: 'BSS Vidyodaya', date: '2026-10-07' },
  { code: 'S-80220', name: 'Avila Convent', date: '2026-10-07' },
  { code: 'S-174389', name: 'Hemavathi School', date: '2026-10-07' },
  { code: 'S-131629', name: 'Sharada School SD Nagar', date: '2026-10-07' },
  { code: 'S-74732', name: 'Nirmala Public School', date: '2026-10-07' }
];

async function main() {
  console.log(`Checking ${crmEntries.length} CRM entries against database...`);

  let alreadyVisited = 0;
  let inDbUnvisited = 0;
  let notInDb = 0;

  const toMarkVisited = [];
  const toCreateAndMark = [];

  for (const entry of crmEntries) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: entry.code },
          { school_code: entry.code },
          { school_name: { contains: entry.name.split('-')[0].trim() } }
        ]
      }
    });

    if (s) {
      if (s.visited_by_current_user) {
        alreadyVisited++;
        console.log(`[ALREADY VISITED] #${s.s_no} ${s.school_name} (${s.school_id})`);
      } else {
        inDbUnvisited++;
        console.log(`[IN DB UNVISITED -> TO MARK] #${s.s_no} ${s.school_name} (${s.school_id}) -> CRM: ${entry.name}`);
        toMarkVisited.push({ school: s, crm: entry });
      }
    } else {
      notInDb++;
      console.log(`[NOT IN DB -> TO AUTO-CREATE] ${entry.code} - ${entry.name}`);
      toCreateAndMark.push(entry);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Already Visited: ${alreadyVisited}`);
  console.log(`In DB but Unvisited: ${inDbUnvisited}`);
  console.log(`Not in DB: ${notInDb}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
