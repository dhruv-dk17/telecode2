import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Safe global singleton for hot-reloads in Next.js development Turbopack
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: Pool | undefined;
  };
  
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({ connectionString });
  }
  
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  
  prisma = globalForPrisma.prisma;
}

export { prisma };
