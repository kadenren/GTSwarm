import { geminiJson, geminiEnabled, type MediaPart } from './gemini';

/**
 * Turn raw evidence (a pasted log, stack trace or a screenshot of an error) into a one-line problem statement
 * that the solved-problem search can match. Gemini reads screenshots; the fallback parses logs locally.
 */
export interface ProblemDraft { problem: string; context: string; signals: string[]; source: 'gemini' | 'rules' }

const SCHEMA = {
  type: 'object',
  required: ['problem', 'context', 'signals'],
  properties: {
    problem: { type: 'string', description: 'One plain-English sentence describing the failure and when it happens, like "BLE connection drops when the MCU enters sleep mode". No error codes.' },
    context: { type: 'string', description: 'One short sentence on the hardware, framework or tool involved, if visible' },
    signals: { type: 'array', items: { type: 'string' }, description: 'Up to 4 key error messages or codes copied exactly from the evidence' },
  },
};

const SYSTEM = 'You help an engineering student describe a bug so they can find someone who already solved it. Read the log text and any screenshot, then describe the underlying problem in plain words. Use only what the evidence shows.';

const ERROR_LINE = /(error|fail|fatal|exception|panic|timeout|timed out|disconnect|reset|brownout|overflow|underrun|refused|denied|lost|drop|watchdog|hardfault|assert)/i;

/** Human-readable phrases for common embedded and software failure signatures. */
const PATTERNS: [RegExp, string][] = [
  [/supervision timeout|reason 0x08|conn(ection)? (lost|dropped)|ble.*disconnect/i, 'BLE connection drops'],
  [/wi-?fi.*(disconnect|lost)|wifi_event_sta_disconnected/i, 'Wi-Fi disconnects'],
  [/brownout|bod reset/i, 'device resets from a brownout'],
  [/watchdog|wdt (reset|timeout)|task_wdt/i, 'watchdog resets the device'],
  [/hard ?fault|bus ?fault/i, 'firmware crashes with a hard fault'],
  [/i2c.*(timeout|nack|bus busy)/i, 'I2C bus stops responding'],
  [/out of memory|cuda.*memory|oom/i, 'runs out of memory'],
  [/(qos|message).*(dropped|lost)|ros2?/i, 'ROS 2 messages are lost'],
];
const CONTEXT: [RegExp, string][] = [
  [/(sleep|system off|low.?power|idle|suspend|pm_state)/i, 'when the device enters sleep mode'],
  [/(motor|pwm|servo)/i, 'when the motor starts'],
  [/(ota|dfu|firmware update)/i, 'during a firmware update'],
  [/(charg)/i, 'while charging'],
];

export function problemFromLog(log: string): ProblemDraft {
  const lines = log.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors = lines.filter((l) => ERROR_LINE.test(l));
  const cleaned = (l: string) => l.replace(/^\[?[\d:.\-T ]+\]?\s*/, '').replace(/<\w+>\s*/g, '').replace(/0x[0-9a-f]+/gi, '').trim();
  const what = PATTERNS.find(([r]) => r.test(log))?.[1];
  const when = CONTEXT.find(([r]) => r.test(log))?.[1];
  const problem = what
    ? `${what.charAt(0).toUpperCase()}${what.slice(1)}${when ? ` ${when}` : ''}`
    : errors[0] ? cleaned(errors[0]).slice(0, 120) : 'The log does not show a clear error; describe what you expected to happen.';
  const ctx = /nrf5|zephyr/i.test(log) ? 'nRF52 / Zephyr firmware' : /esp32|esp-idf/i.test(log) ? 'ESP32 firmware' : /stm32/i.test(log) ? 'STM32 firmware' : /ros/i.test(log) ? 'ROS 2' : '';
  return { problem, context: ctx, signals: [...new Set(errors.map(cleaned))].slice(0, 4), source: 'rules' };
}

export async function problemFromEvidence(log: string, media: MediaPart[]): Promise<ProblemDraft> {
  if (geminiEnabled() && (media.length || log.trim())) {
    const d = await geminiJson<Omit<ProblemDraft, 'source'>>({ system: SYSTEM, text: log ? `Log or error text:\n${log.slice(0, 20000)}` : 'Read the attached screenshot.', media, schema: SCHEMA });
    if (d?.problem) return { problem: d.problem.trim(), context: (d.context ?? '').trim(), signals: (d.signals ?? []).slice(0, 4), source: 'gemini' };
  }
  return problemFromLog(log);
}
