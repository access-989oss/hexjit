import { signAccessToken } from "../src/security/jwt.js";

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: tsx scripts/gen-token.ts <userId>");
  process.exit(1);
}

const token = await signAccessToken(userId, "user");
process.stdout.write(token);
