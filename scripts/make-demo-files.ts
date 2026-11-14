/**
 * Generates the sample files used in the live demo (all fictional):
 *   demo-files/1-HydraBand-capstone-report.pdf   -> Add project (text PDF, works with or without Gemini)
 *   demo-files/2-HydraBand-poster.jpg            -> Add project (phone photo of a poster, read by Gemini)
 *   demo-files/3-HydraBand-README.md             -> Add project (Markdown)
 *   demo-files/4-resume-Rachel-Bianchi-alum.pdf  -> Join GT Swarm (an alum creates their own profile)
 *   demo-files/5-resume-Leo-Martinez.pdf         -> Profile (update your profile from your resume)
 *   demo-files/6-hydraband-serial-log.txt        -> I'm stuck (log -> problem statement)
 *   demo-files/7-error-screenshot.png            -> I'm stuck (screenshot, read by Gemini)
 * Run: npx tsx scripts/make-demo-files.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const OUT = path.join(process.cwd(), 'demo-files');
fs.mkdirSync(OUT, { recursive: true });
const NAVY = rgb(0, 0.188, 0.341), GOLD = rgb(0.702, 0.639, 0.412), INK = rgb(0.12, 0.16, 0.21);

// ---------- tiny PDF layout helper ----------
class Doc {
  page!: PDFPage; y = 0; constructor(public pdf: PDFDocument, public font: PDFFont, public bold: PDFFont) { this.newPage(); }
  newPage() { this.page = this.pdf.addPage([612, 792]); this.y = 740; }
  ensure(h: number) { if (this.y - h < 60) this.newPage(); }
  text(t: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) {
    const size = o.size ?? 10.5, f = o.bold ? this.bold : this.font, x = 64 + (o.indent ?? 0), width = 612 - x - 64;
    const words = t.split(' '); let line = '';
    const flush = () => { this.ensure(size + 4); this.page.drawText(line, { x, y: this.y, size, font: f, color: o.color ?? INK }); this.y -= size * 1.38; line = ''; };
    for (const w of words) { const next = line ? `${line} ${w}` : w; if (f.widthOfTextAtSize(next, size) > width) { flush(); line = w; } else line = next; }
    if (line) flush();
    this.y -= o.gap ?? 5;
  }
  rule() { this.ensure(10); this.page.drawLine({ start: { x: 64, y: this.y + 4 }, end: { x: 548, y: this.y + 4 }, thickness: 1.2, color: GOLD }); this.y -= 10; }
}

async function report() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('HydraBand capstone report'); pdf.setAuthor('HydraBand team (fictional demo data)');
  const d = new Doc(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  d.text('HydraBand: A Sweat-Sensing Hydration Band', { size: 20, bold: true, color: NAVY, gap: 2 });
  d.text('ECE Senior Design, Spring 2026  |  Georgia Institute of Technology  |  Final report', { size: 10, color: GOLD, gap: 10 });
  d.rule();
  d.text('Summary', { size: 13, bold: true, color: NAVY });
  d.text('HydraBand is a wrist-worn wearable that estimates sweat loss and sodium concentration for outdoor workers and athletes, and warns before dehydration sets in. The band pairs a sweat electrode patch with a heart-rate PPG sensor on an nRF52 microcontroller running Zephyr RTOS, and streams data over BLE to a phone app built in React Native.');
  d.text('We built three prototypes between January and April 2026 and tested the final one with 14 Georgia Tech club athletes during summer practice conditions.');
  d.text('Team', { size: 13, bold: true, color: NAVY });
  d.text('Five students in Electrical, Computer and Biomedical Engineering, advised by a medical-device alum through GT Swarm.');
  d.text('Technical approach', { size: 13, bold: true, color: NAVY });
  d.text('Hardware: a two-layer flexible PCB design with a sweat conductivity front end, a PPG sensor and a 120 mAh battery. Firmware: Zephyr RTOS on the nRF52 with BLE notifications every 30 seconds. Signal processing: motion-artifact rejection on PPG using the accelerometer, and a baseline model for electrode drift.');
  d.text('Problems we solved', { size: 13, bold: true, color: NAVY });
  d.text('The main problem was that sweat sodium readings drifted as the electrode dried out, so we fixed it by adding a hydrogel layer and recalibrating the baseline every ten minutes.');
  d.text('We also struggled with battery life under one day, so we solved it by duty-cycling the sensor front end and batching BLE notifications every 30 seconds.');
  d.text('Another issue was that the phone lost data whenever the app went to the background, so we fixed it by buffering readings on the band and syncing with sequence numbers when the app resumed.');
  d.text('Open problem', { size: 13, bold: true, color: NAVY });
  d.text('The BLE connection still drops when the band enters sleep mode between readings. We plan to ask the GT Swarm community for help before the next team inherits the project.');
  d.text('Results', { size: 13, bold: true, color: NAVY });
  d.text('Sweat-loss estimates were within 9 percent of weighed water loss across 14 athletes. Battery life reached 3.5 days. The project placed in the top three of the ECE track at the Capstone Expo.');
  d.text('Fictional demo document created for GT Swarm.', { size: 8, color: GOLD });
  fs.writeFileSync(path.join(OUT, '1-HydraBand-capstone-report.pdf'), await pdf.save());
}

async function resume() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Leo Martinez resume (fictional)');
  const d = new Doc(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  d.text('Leo Martinez', { size: 22, bold: true, color: NAVY, gap: 2 });
  d.text('Atlanta, GA  |  leo.martinez@example.edu  |  Fictional demo resume', { size: 9.5, color: GOLD, gap: 10 });
  d.rule();
  d.text('Summary', { size: 12, bold: true, color: NAVY });
  d.text('Business student and startup cofounder who turns hardware prototypes into products customers want. I run customer discovery, pricing and fundraising for a student wearable startup and work closely with engineers on what to build next.');
  d.text('Education', { size: 12, bold: true, color: NAVY });
  d.text('Georgia Institute of Technology, Scheller College of Business. B.S. Business Administration, concentration in Innovation and Entrepreneurship. Expected May 2026. GPA 3.7.');
  d.text('Experience', { size: 12, bold: true, color: NAVY });
  d.text('Cofounder, PulseBand (student startup), 2025 to present. Led customer discovery with 40 club athletes and coaches; set pricing; wrote the CREATE-X Startup Launch application, which was accepted.');
  d.text('Product intern, a digital health startup in Atlanta, Summer 2025. Ran 25 user interviews and turned them into a prioritized roadmap; built a pricing model in Excel.');
  d.text('Projects', { size: 12, bold: true, color: NAVY });
  d.text('Club Athlete Recovery Study (2025, Lab). Designed and ran a four-week study with 12 club athletes comparing recovery scores with coach ratings, and presented the results to two varsity coaching staffs.');
  d.text('Campus Hardware Pitch Night (2024, Club). Organized a pitch night for 9 student hardware teams with 60 attendees and 5 alumni judges.');
  d.text('Skills', { size: 12, bold: true, color: NAVY });
  d.text('Customer discovery, Fundraising, Pricing, Market research, Python, Excel modeling, React Native (basic), Wearables.');
  fs.writeFileSync(path.join(OUT, '5-resume-Leo-Martinez.pdf'), await pdf.save());
}

async function alumResume() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Rachel Bianchi resume (fictional)');
  const d = new Doc(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  d.text('Rachel Bianchi', { size: 22, bold: true, color: NAVY, gap: 2 });
  d.text('Boston, MA  |  rachel.bianchi@example.com  |  Fictional demo resume', { size: 9.5, color: GOLD, gap: 10 });
  d.rule();
  d.text('Summary', { size: 12, bold: true, color: NAVY });
  d.text('Firmware lead for battery-powered medical wearables. I make Bluetooth Low Energy links reliable through deep sleep and get devices through FDA design controls. I enjoy helping student hardware teams avoid the mistakes I made.');
  d.text('Experience', { size: 12, bold: true, color: NAVY });
  d.text('Firmware Lead, a hearing-health wearables company, 2021 to present. Lead a team of five on nRF52 firmware with Zephyr RTOS. Cut BLE disconnects during sleep by 94 percent by keeping the low-frequency clock running and aligning wake-ups with connection events. Shipped two FDA-cleared devices.');
  d.text('Embedded Engineer, a cardiac monitoring startup, 2016 to 2021. Built low-power firmware and BLE streaming for an ECG patch; wrote the software sections of a 510(k) submission.');
  d.text('Education', { size: 12, bold: true, color: NAVY });
  d.text('Georgia Institute of Technology. B.S. Biomedical Engineering, May 2016. Minor in Computer Science.');
  d.text('Georgia Tech projects', { size: 12, bold: true, color: NAVY });
  d.text('Smart Pill Bottle (2016, BME Capstone). Built a pill bottle cap that logs openings and syncs over BLE to remind patients to take medication; piloted with 20 patients at a campus clinic.');
  d.text('VIP Wearable Sensing (2015). Wrote the first BLE firmware for a wrist-worn skin temperature sensor.');
  d.text('Skills', { size: 12, bold: true, color: NAVY });
  d.text('BLE, Firmware, nRF52, Zephyr RTOS, Power management, ECG, Medical devices, FDA regulatory, C, Python.');
  fs.writeFileSync(path.join(OUT, '4-resume-Rachel-Bianchi-alum.pdf'), await pdf.save());
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function poster() {
  const W = 1600, H = 1200;
  const box = (x: number, y: number, w: number, h: number, title: string, lines: string[]) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="#d9d4c3" stroke-width="2"/>
    <text x="${x + 28}" y="${y + 52}" font-family="Arial" font-size="34" font-weight="700" fill="#003057">${esc(title)}</text>
    ${lines.map((l, i) => `<text x="${x + 28}" y="${y + 100 + i * 38}" font-family="Arial" font-size="25" fill="#1E2A36">${esc(l)}</text>`).join('')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#F7F6F2"/>
    <rect width="${W}" height="190" fill="#003057"/>
    <text x="60" y="95" font-family="Arial" font-size="64" font-weight="700" fill="#ffffff">HydraBand</text>
    <text x="60" y="150" font-family="Arial" font-size="30" fill="#B3A369">A sweat-sensing hydration band  |  ECE Senior Design, Spring 2026  |  Georgia Tech</text>
    ${box(60, 230, 720, 420, 'What we built', ['Wrist-worn wearable that estimates sweat loss', 'and sodium for outdoor workers and athletes.', 'nRF52 + Zephyr RTOS, BLE to a React Native app.', 'Flexible PCB design, PPG sensor, 120 mAh battery.', 'Tested with 14 Georgia Tech club athletes.'])}
    ${box(820, 230, 720, 420, 'Problems we solved', ['Sodium readings drifted as the electrode dried:', '  hydrogel layer + baseline recalibration.', 'Battery lasted under a day:', '  duty-cycled sensors, batched BLE every 30 s.', 'App lost data in the background:', '  on-band buffer + sequence-number sync.'])}
    ${box(60, 690, 720, 320, 'Results', ['Sweat-loss estimate within 9% of weighed loss', 'Battery life: 3.5 days', 'Top 3, ECE track, Capstone Expo 2026'])}
    ${box(820, 690, 720, 320, 'Still open', ['BLE connection drops when the band', 'enters sleep mode between readings.', 'Looking for someone who has fixed this!'])}
    <text x="60" y="1150" font-family="Arial" font-size="22" fill="#857437">Fictional demo poster created for GT Swarm</text>
  </svg>`;
  // a slight rotation and warm tint make it read as a phone photo of a printed poster
  const flat = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp({ create: { width: W + 120, height: H + 120, channels: 3, background: '#4a4a52' } })
    .composite([{ input: await sharp(flat).rotate(-1.6, { background: '#4a4a52' }).toBuffer(), left: 40, top: 30 }])
    .modulate({ brightness: 0.97, saturation: 0.95 })
    .jpeg({ quality: 88 })
    .toFile(path.join(OUT, '2-HydraBand-poster.jpg'));
}

const LOG = `*** Booting Zephyr OS build v3.6.0 ***
[00:00:00.004] <inf> hydraband: HydraBand fw 0.9.3 starting on nRF52840
[00:00:00.118] <inf> bt_hci_core: HW Platform: Nordic Semiconductor (0x0002)
[00:00:00.121] <inf> bt_hci_core: Identity: D4:7A:21:0C:9E:13 (random)
[00:00:00.402] <inf> hydraband: Advertising started
[00:00:05.731] <inf> bt_conn: Connected: 6B:2F:91:44:AA:10 (random), interval 30 ms
[00:00:35.733] <inf> sensors: sweat=41.2 uS, hr=96 bpm, notify ok
[00:01:05.734] <inf> sensors: sweat=42.0 uS, hr=101 bpm, notify ok
[00:01:06.002] <inf> pm: Entering PM_STATE_SUSPEND_TO_IDLE (system off between samples)
[00:01:06.002] <dbg> clock_control: LFCLK stop requested
[00:01:12.310] <wrn> bt_conn: Disconnected: 6B:2F:91:44:AA:10 (reason 0x08, supervision timeout)
[00:01:12.311] <err> hydraband: BLE link lost while sensor was asleep
[00:01:35.736] <inf> pm: Exiting PM_STATE_SUSPEND_TO_IDLE
[00:01:35.740] <err> sensors: notify failed (-128, not connected), buffering 1 sample
[00:01:36.120] <inf> hydraband: Advertising restarted
[00:01:41.877] <inf> bt_conn: Connected: 6B:2F:91:44:AA:10 (random), interval 30 ms
[00:02:11.902] <inf> pm: Entering PM_STATE_SUSPEND_TO_IDLE (system off between samples)
[00:02:18.215] <wrn> bt_conn: Disconnected: 6B:2F:91:44:AA:10 (reason 0x08, supervision timeout)
[00:02:18.216] <err> hydraband: BLE link lost while sensor was asleep`;

async function screenshot() {
  const lines = LOG.split('\n');
  const W = 1500, lh = 30, H = 120 + lines.length * lh;
  const color = (l: string) => (l.includes('<err>') ? '#ff6b6b' : l.includes('<wrn>') ? '#f5c451' : l.includes('<dbg>') ? '#7d8796' : '#d7dde6');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" rx="14" fill="#1b1f27"/>
    <rect width="${W}" height="46" rx="14" fill="#2a2f3a"/><rect y="30" width="${W}" height="16" fill="#2a2f3a"/>
    <circle cx="30" cy="23" r="8" fill="#ff5f57"/><circle cx="56" cy="23" r="8" fill="#febc2e"/><circle cx="82" cy="23" r="8" fill="#28c840"/>
    <text x="${W / 2}" y="29" text-anchor="middle" font-family="Consolas, monospace" font-size="17" fill="#aab2bf">COM7 - HydraBand serial monitor (115200 baud)</text>
    ${lines.map((l, i) => `<text x="24" y="${86 + i * lh}" font-family="Consolas, monospace" font-size="19" fill="${color(l)}">${esc(l)}</text>`).join('')}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, '7-error-screenshot.png'));
}

function textFiles() {
  fs.writeFileSync(path.join(OUT, '6-hydraband-serial-log.txt'), LOG + '\n');
  fs.writeFileSync(path.join(OUT, '3-HydraBand-README.md'), `# HydraBand

Sweat-sensing hydration band. ECE Senior Design, Spring 2026, Georgia Tech. (Fictional demo project for GT Swarm.)

HydraBand estimates sweat loss and sodium concentration for outdoor workers and athletes. Firmware runs on an nRF52 with Zephyr RTOS and streams over BLE to a React Native app.

## Hardware
- Flexible PCB design with a sweat conductivity front end
- PPG sensor and accelerometer
- 120 mAh battery, 3.5 days per charge

## Problems solved
- Sweat sodium readings drifted as the electrode dried out, so we fixed it by adding a hydrogel layer and recalibrating the baseline every ten minutes.
- Battery life was under a day, so we solved it by duty-cycling the sensor front end and batching BLE notifications every 30 seconds.

## Known issue
- The BLE connection drops when the band enters sleep mode between readings.
`);
}

(async () => {
  for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f));
  await Promise.all([report(), resume(), alumResume(), poster(), screenshot()]);
  textFiles();
  for (const f of fs.readdirSync(OUT)) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB');
})();
