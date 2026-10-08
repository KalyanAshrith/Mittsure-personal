import fs from 'fs';
import readline from 'readline';

async function extractUserRequests() {
  const fileStream = fs.createReadStream('C:/Users/User/.gemini/antigravity/brain/8bb68d02-dfdb-4188-86fa-c7ff0dd12fd0/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (line.includes('"USER_INPUT"')) {
      count++;
      const data = JSON.parse(line);
      const idx = data.content.toUpperCase().indexOf('COMPLETION');
      if (idx !== -1) {
        console.log(`\n=== INPUT ${count}: COMPLETION ===`);
        console.log(data.content.substring(idx, idx + 1000));
      }
    }
  }
}
extractUserRequests();
