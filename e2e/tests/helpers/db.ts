import { Client } from "pg";
import { DATABASE_URL } from "../../env.js";

// Raw pg client, deliberately not Prisma — the suite has no reason to know
// the app's schema/generated-client details, it only ever needs a couple of
// one-off teardown queries for rows the tests themselves created (e.g. a
// customer account from the auth spec). The actual test flows always drive
// the real HTTP API/UI, never the DB.
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in e2e/.env — see e2e/.env.example");
  }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function deleteUserByEmail(email: string): Promise<void> {
  await withClient((client) => client.query(`DELETE FROM "dbo"."User" WHERE "email" = $1`, [email]));
}
