const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rawItems = [
  // Group A
  { label: 'DGTM English Medium School', crm: 'S-116933', noteSno: 245 },
  { label: 'JSS School Saraswathipuram', crm: 'S-125355' },
  { label: 'Christ The King Convent Public School', crm: 'S-18094', noteSno: 231 },
  { label: 'JSS Public School, JSS Institutions Campus, B.R.', crm: 'S-17802' },
  { label: 'Super Kidz Pre School', crm: 'S-143362' },
  { label: 'Vishwamanava Vidyanikethana', crm: 'S-76584', noteSno: 482 },
  { label: 'Ramakrishna Vidya Kendra', noteSno: 356 },
  { label: 'Sri Ranga Gurukula', noteSno: 419 },
  { label: 'Tree Top Pre School Mysuru', noteSno: 462 },
  { label: 'Supreme Public School-Mysuru', noteSno: 450 },

  // Group B (Table)
  { label: 'Ace Priyadarshini School', userSno: 181 },
  { label: 'Akshara Pathshala', userSno: 187 },
  { label: 'Amrita Vidyalayam-Mysuru', userSno: 191 },
  { label: 'Basil Buds International School', userSno: 201 },
  { label: 'Bharatiya Vidya Bhavan School Vijayanagar', userSno: 211 },
  { label: 'Cauvery School', userSno: 223 },
  { label: 'Christ Public School-Mysuru', userSno: 229 },
  { label: 'Gnana Ganga School', userSno: 260 },
  { label: 'Gokula School', userSno: 263 },
  { label: 'Mysore Public School-Mysuru', userSno: 330 },
  { label: 'Mysore West Lions Sevaniketan School', userSno: 331 },
  { label: 'NPS International School-Mysuru', userSno: 342 },
  { label: 'Pragathi Elite Public School-Mysuru', userSno: 347 },
  { label: 'Pramati Hill View Academy-Mysuru', userSno: 350 },
  { label: 'Purna Chetana Public School-Mysuru', userSno: 352 },
  { label: 'Rotary Mysore School', userSno: 360 },
  { label: 'Rotary West School Saraswathi Puram', userSno: 365 },
  { label: 'Royale Concord International School-Mysuru', userSno: 366 },
  { label: 'S.V.E.I. School-Mysuru', userSno: 367 },
  { label: 'Sadvidya School', userSno: 368 },
  { label: 'Sharada Vidya Samsthe B Metagere', userSno: 381 },
  { label: 'Sharada Vilas School', userSno: 382 },
  { label: 'Shri Sharada Public School', userSno: 396 },
  { label: 'Sri Adichunchanagiri Central School', userSno: 409 },
  { label: 'Sri Adichunchanagiri Higher Primary & High School Gungralchatra', userSno: 410 },
  { label: 'St. Maria De Mattias School-Mysuru', userSno: 439 },
  { label: 'Subhodaya School', userSno: 445 },
  { label: 'Taralabalu School', userSno: 457 },
  { label: 'Vishwamanava Vidyanikethana', userSno: 482 },

  // Group C
  { label: 'Intelligent Public School-Mysuru', extra: 'intelligent school also done' }
];

async function check() {
  const all = await prisma.school.findMany({
    include: { visits: { where: { representative_id: 'KA-REP-01' } } }
  });

  console.log(`Loaded ${all.length} schools from DB.`);

  for (const item of rawItems) {
    let matched = null;
    let matchType = '';

    // 1. By CRM code
    if (item.crm) {
      matched = all.find(s => s.school_id.toLowerCase() === item.crm.toLowerCase());
      if (matched) matchType = `CRM (${item.crm})`;
    }

    // 2. By noteSno / userSno if name also matches
    if (!matched && (item.noteSno || item.userSno)) {
      const sno = item.noteSno || item.userSno;
      const cand = all.find(s => s.s_no === sno);
      if (cand) {
        // check if name loosely matches
        const cleanCand = cand.school_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanItem = item.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanCand.includes(cleanItem) || cleanItem.includes(cleanCand)) {
          matched = cand;
          matchType = `Exact S.No ${sno} + Name Match`;
        }
      }
    }

    // 3. By Name exact or fuzzy
    if (!matched) {
      const cleanItem = item.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameMatches = all.filter(s => {
        const cleanDb = s.school_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanDb === cleanItem || cleanDb.includes(cleanItem) || cleanItem.includes(cleanDb);
      });

      if (nameMatches.length === 1) {
        matched = nameMatches[0];
        matchType = `Unique Name Match`;
      } else if (nameMatches.length > 1) {
        // pick closest or log
        matched = nameMatches[0];
        matchType = `Multiple Name Matches (${nameMatches.length}) -> picked first`;
      }
    }

    // 4. By S.No alone if still not matched
    if (!matched && (item.noteSno || item.userSno)) {
      const sno = item.noteSno || item.userSno;
      const cand = all.find(s => s.s_no === sno);
      if (cand) {
        matched = cand;
        matchType = `S.No ${sno} alone (DB name: "${cand.school_name}")`;
      }
    }

    if (matched) {
      console.log(`MATCHED: "${item.label}" -> DB S.No ${matched.s_no} | ${matched.school_id} | "${matched.school_name}" [${matched.board}] (${matched.area}) via ${matchType}`);
      console.log(`         visited_by_current_user: ${matched.visited_by_current_user}, visit_status: ${matched.visit_status}, visits count: ${matched.visits.length}`);
    } else {
      console.log(`FAILED TO MATCH: "${item.label}" (crm: ${item.crm}, noteSno: ${item.noteSno}, userSno: ${item.userSno})`);
    }
  }
}

check().catch(console.error).finally(() => prisma['$disconnect']());
