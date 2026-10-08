import fs from 'fs';
import readline from 'readline';

async function checkInput1() {
  const fileStream = fs.createReadStream('C:/Users/User/.gemini/antigravity/brain/8bb68d02-dfdb-4188-86fa-c7ff0dd12fd0/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (line.includes('"USER_INPUT"')) {
      count++;
      if (count === 1) {
        const data = JSON.parse(line);
        console.log(data.content.substring(0, 4000));
        break;
      }
    }
  }
}
checkInput1();
