import { sql } from '@vercel/postgres';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

function toCSV(rows) {
  if (!rows.length) return '(empty)';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach(row => {
    const values = headers.map(h => {
      let val = row[h] ?? '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

async function exportAll() {
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  console.log('Exporting tables...\n');

  const people = await sql`SELECT * FROM people ORDER BY id`;
  fs.writeFileSync(path.join(exportDir, 'people.csv'), toCSV(people.rows));
  console.log(`✓ exports/people.csv (${people.rows.length} rows)`);

  const orgs = await sql`SELECT * FROM organizations ORDER BY id`;
  fs.writeFileSync(path.join(exportDir, 'organizations.csv'), toCSV(orgs.rows));
  console.log(`✓ exports/organizations.csv (${orgs.rows.length} rows)`);

  const resources = await sql`SELECT * FROM resources ORDER BY id`;
  fs.writeFileSync(path.join(exportDir, 'resources.csv'), toCSV(resources.rows));
  console.log(`✓ exports/resources.csv (${resources.rows.length} rows)`);

  console.log('\nExport complete.');
}

exportAll().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
