/**
 * Verifies DATABASE_URL (MongoDB) by connecting via Prisma.
 * Usage: npm run db:test   (reads .env from project root)
 */
const path = require("path");
const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env") });
require("dotenv").config({ path: path.join(root, ".env.local") });
const { PrismaClient } = require("@prisma/client");

function redactUrl(u) {
  if (!u) return "(empty)";
  try {
    const parsed = new URL(u);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "(invalid URL shape)";
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !String(url).trim()) {
    console.error("DATABASE_URL is missing or empty. Set it in .env");
    process.exit(1);
  }
  console.log("Connecting to:", redactUrl(url));

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("Result: connection OK (Prisma can reach the database).");
  } catch (err) {
    console.error("Result: connection failed.");
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
