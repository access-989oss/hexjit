import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const costs = [
  ["text", 1],
  ["vision", 1],
  ["image", 1],
  ["speech_to_text", 1],
  ["text_to_speech", 1],
  ["video", 1],
] as const;

for (const [capability, cost] of costs) {
  await prisma.creditCost.upsert({
    where: {
      capability,
    },
    create: {
      capability,
      cost,
      isEnabled: true,
    },
    update: {},
  });
}

console.log(
  "Hexjit default credit costs initialized.",
);

await prisma.$disconnect();
