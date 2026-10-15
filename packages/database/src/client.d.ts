import postgres from "postgres";
import * as schema from "./schema";
export declare const sql: postgres.Sql<{}>;
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export type Database = typeof db;
//# sourceMappingURL=client.d.ts.map