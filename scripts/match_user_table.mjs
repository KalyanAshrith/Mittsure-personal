import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const userTable = [
  { sno: 457, name: 'Taralabalu School', planned_for: 'Day 1', type: 'Visit' },
  { sno: 349, name: 'Pragathi Vidya Kendra Bogadhi', planned_for: 'Day 1', type: 'Visit' },
  { sno: 258, name: 'Gangotri Public School', planned_for: 'Day 1', type: 'Visit' },
  { sno: 191, name: 'Amrita Vidyalayam-Mysuru', planned_for: 'Day 1', type: 'Visit' },
  { sno: 229, name: 'Christ Public School-Mysuru', planned_for: 'Day 1', type: 'Visit' },
  { sno: 347, name: 'Pragathi Elite Public School-Mysuru', planned_for: 'Day 1', type: 'Visit' },
  { sno: 355, name: 'Rainbow Public School-Mysuru', planned_for: 'Day 1', type: 'Visit' },
  { sno: 211, name: 'Bharatiya Vidya Bhavan School Vijayanagar', planned_for: 'Day 1/Follow-up plan', type: 'Visit' },
  { sno: 367, name: 'S.V.E.I. School-Mysuru', planned_for: 'Day 1/Follow-up plan', type: 'Visit' },
  { sno: 342, name: 'NPS International School-Mysuru', planned_for: 'Day 1/Follow-up plan', type: 'Visit' },
  { sno: 201, name: 'Basil Buds International School', planned_for: 'Day 2', type: 'Visit' },
  { sno: 223, name: 'Cauvery School', planned_for: 'Day 2', type: 'Visit' },
  { sno: 260, name: 'Gnana Ganga School', planned_for: 'Day 2', type: 'Visit' },
  { sno: 263, name: 'Gokula School', planned_for: 'Day 2', type: 'Visit' },
  { sno: 350, name: 'Pramati Hill View Academy-Mysuru', planned_for: 'Day 2', type: 'Visit' },
  { sno: 396, name: 'Shri Sharada Public School', planned_for: 'Day 2', type: 'Visit' },
  { sno: 445, name: 'Subhodaya School Kuvempunagar', planned_for: 'Day 2', type: 'Visit' },
  { sno: 181, name: 'Ace Priyadarshini School', planned_for: 'Saturday / Today', type: 'Revisit' },
  { sno: 187, name: 'Akshara Pathshala', planned_for: 'Saturday / Today', type: 'Revisit' },
  { sno: 366, name: 'Royale Concord International School-Mysuru', planned_for: 'Saturday', type: 'Revisit' },
  { sno: 331, name: 'Mysore West Lions Sevaniketan School', planned_for: 'Today – 7 Sep', type: 'Visit' },
  { sno: 360, name: 'Rotary Mysore School', planned_for: 'Today – 7 Sep', type: 'Visit' },
  { sno: 365, name: 'Rotary West School Saraswathi Puram', planned_for: 'Today – 7 Sep', type: 'Visit' },
  { sno: 368, name: 'Sadvidya School', planned_for: 'Today – 7 Sep', type: 'Visit' },
  { sno: 382, name: 'Sharada Vilas School', planned_for: 'Today – 7 Sep', type: 'Visit' },
];

async function match() {
  const allSchools = await prisma.school.findMany();
  console.log(`Total schools in DB: ${allSchools.length}`);

  for (const item of userTable) {
    // Try matching by exact s_no
    const bySno = allSchools.find(s => s.s_no === item.sno);
    
    // Try matching by name (fuzzy / clean)
    const cleanItemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const byName = allSchools.filter(s => {
      const cleanDb = s.school_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanDb.includes(cleanItemName) || cleanItemName.includes(cleanDb);
    });

    console.log(`\nUser: [S.No ${item.sno}] "${item.name}" (${item.planned_for}, ${item.type})`);
    if (bySno) {
      console.log(`  -> Match by S.No ${item.sno}: "${bySno.school_name}" [${bySno.school_id}] in ${bySno.area}`);
    } else {
      console.log(`  -> Match by S.No ${item.sno}: NOT FOUND`);
    }

    if (byName.length > 0) {
      console.log(`  -> Match by Name (${byName.length}):`);
      for (const n of byName) {
        console.log(`     S.No ${n.s_no}: "${n.school_name}" [${n.school_id}] in ${n.area} (visited: ${n.visited_by_current_user})`);
      }
    } else {
      console.log(`  -> Match by Name: NO DIRECT SUBSTRING MATCH`);
      // Try first 2 words
      const words = item.name.split(' ').slice(0, 2).join(' ').toLowerCase();
      const partial = allSchools.filter(s => s.school_name.toLowerCase().includes(words));
      if (partial.length > 0) {
        console.log(`     Partial words "${words}":`);
        for (const p of partial) {
          console.log(`       S.No ${p.s_no}: "${p.school_name}" [${p.school_id}] in ${p.area}`);
        }
      }
    }
  }
}

match().catch(console.error).finally(() => prisma.$disconnect());
