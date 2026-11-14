import postgres from 'postgres';
const all=['people','projects','skills','person_project','person_skill','project_skill','problems','milestones','connections','requests','project_link','person_link','project_status','person_pref','gemini_vec','cache','meta'];
for (const [label, list] of [['without gemini_vec', all.filter(t=>t!=='gemini_vec')], ['with gemini_vec', all]]) {
  const t0=Date.now();
  const sql = postgres(process.env.DATABASE_URL, { prepare:false, max:3, connect_timeout:15, ssl:'require' });
  const timer = setTimeout(()=>{ console.log(label, 'HUNG after 20s'); process.exit(2); }, 20000);
  await Promise.all(list.map(t => sql.unsafe(`SELECT * FROM gts.${t}`)));
  clearTimeout(timer); console.log(label, 'ok', Date.now()-t0, 'ms'); await sql.end();
}
