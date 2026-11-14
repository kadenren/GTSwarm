import { describe, it, expect } from 'vitest';
import { textFromFile, textFromLink } from '@/lib/ingest';
import { readNeed } from '@/lib/scout';

/** Builds a minimal one-page PDF with the given text (valid xref offsets). */
function tinyPdf(text: string): Buffer {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

describe('project ingestion', () => {
  it('reads text and Markdown files', async () => {
    const r = await textFromFile('notes.md', Buffer.from('# ThermoCuff\nWearable cuff on an nRF52.'));
    expect(r.info.ok).toBe(true);
    expect(r.text).toContain('ThermoCuff');
  });
  it('reads PDF text', async () => {
    const r = await textFromFile('poster.pdf', tinyPdf('ThermoCuff capstone poster'));
    expect(r.info.kind).toBe('pdf');
    expect(r.text).toContain('ThermoCuff capstone poster');
  });
  it('rejects unsupported files and private links without crashing', async () => {
    expect((await textFromFile('photo.png', Buffer.from([1, 2, 3]))).info.ok).toBe(false);
    expect((await textFromLink('http://localhost:3000/secret')).info.ok).toBe(false);
    expect((await textFromLink('not a url')).info.ok).toBe(false);
  });
});

describe('scout request reading', () => {
  it('infers role and audience from plain words', () => {
    expect(readNeed('We need an advisor who has been through FDA clearance')).toMatchObject({ role: 'Advisor', audience: 'both' });
    expect(readNeed('Looking to hire students who write wearable firmware')).toMatchObject({ role: 'Early engineer', audience: 'students' });
    expect(readNeed('Bluetooth drops when the sensor sleeps')).toMatchObject({ role: 'Helper' });
    expect(readNeed('Find me a cofounder among alumni')).toMatchObject({ role: 'Cofounder', audience: 'alumni' });
  });
});
