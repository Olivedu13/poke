import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

interface AppSettings {
  adminCode: string;
  parentalCode: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  adminCode: '7452',
  parentalCode: '1234',
};

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }
  // Write defaults if file doesn't exist
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  return { ...DEFAULT_SETTINGS };
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

export function getAdminCode(): string {
  return getSettings().adminCode;
}

export function getParentalCode(): string {
  return getSettings().parentalCode;
}
