import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDbForConnection(connectionString = process.env.DATABASE_URL) {

  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured before using the database.");
  }

  return drizzle(neon(connectionString), { schema });
}

export function getDb() {
  return getDbForConnection();
}
