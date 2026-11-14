import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: "require" });
await sql`TRUNCATE gts.session_ops`;
console.log("test sessions cleared");
await sql.end();
