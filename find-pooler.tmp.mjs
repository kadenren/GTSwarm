// Find which Supabase pooler region hosts this project (reads the password from the environment, prints no secrets).
import postgres from 'postgres';
const ref = process.env.SB_REF, pw = encodeURIComponent(process.env.SB_PW);
const regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-north-1', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'sa-east-1'];
for (const pre of ['aws-0', 'aws-1']) {
  for (const r of regions) {
    const host = `${pre}-${r}.pooler.supabase.com`;
    const url = `postgresql://postgres.${ref}:${pw}@${host}:6543/postgres`;
    const sql = postgres(url, { prepare: false, max: 1, ssl: 'require', connect_timeout: 8, onnotice: () => {} });
    try {
      const [{ v }] = await sql`select version() as v`;
      console.log('FOUND', host, v.slice(0, 40));
      await sql.end();
      process.stdout.write(`URL_HOST=${host}\n`);
      process.exit(0);
    } catch (e) {
      console.log('no', host, String(e.message).slice(0, 60));
      await sql.end({ timeout: 1 }).catch(() => {});
    }
  }
}
process.exit(1);
