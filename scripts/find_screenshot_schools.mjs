import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findSchools() {
  const codes = ['S-74703', 'S-21202', 'S-18103', 'S-125355', 'S-77011', 'S-28203'];
  console.log("Searching for codes:", codes);

  for (const c of codes) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: c },
          { school_code: c },
          { school_id: { contains: c.replace('S-', '') } }
        ]
      }
    });
    if (s) {
      console.log(`Found ${c}: S.No ${s.s_no} | ${s.school_name} | Board: ${s.board} | Area: ${s.area} | Type: ${s.school_type} | Visited: ${s.visited_by_current_user}`);
    } else {
      console.log(`NOT FOUND by code: ${c}, searching by name...`);
    }
  }
}

findSchools().catch(console.error).finally(() => prisma.$disconnect());
