import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import process from "node:process";
import * as schema from "./schema";
const connectionString = process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/arcon?schema=public";
// For queries and migrations
export const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
