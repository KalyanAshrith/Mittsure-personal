import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const stop = await prisma.routeStop.findUnique({
    where: { id: 'cmu5ib7ii0005s32ifh35p354' },
    include: { route_plan: true }
  });
  console.log('Stop details:', JSON.stringify(stop, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
