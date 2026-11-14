import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAppSettings } from '../context/SettingsContext';
import { classifyCameraError } from './cameraErrors';
import { en } from '../i18n/en';
import { id } from '../i18n/id';
import { DEFAULT_APP_SETTINGS } from '../types/settings';

function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[seg];
    }
    return undefined;
  }, obj);
}

test('English and Indonesian dictionaries have identical leaf keys and non-empty strings', () => {
  const enKeys = collectLeafKeys(en as unknown as Record<string, unknown>);
  const idKeys = collectLeafKeys(id as unknown as Record<string, unknown>);

  assert.deepEqual(enKeys, idKeys);

  for (const key of enKeys) {
    const enVal = getByPath(en as unknown as Record<string, unknown>, key);
    const idVal = getByPath(id as unknown as Record<string, unknown>, key);
    if (Array.isArray(enVal)) {
      assert.ok(Array.isArray(idVal), `Expected array for id.${key}`);
      assert.equal(enVal.length, idVal.length, `Array length mismatch for ${key}`);
      for (let i = 0; i < enVal.length; i++) {
        assert.equal(typeof enVal[i], 'string');
        assert.equal(typeof idVal[i], 'string');
        assert.ok((enVal[i] as string).trim().length > 0);
        assert.ok((idVal[i] as string).trim().length > 0);
      }
    } else {
      assert.equal(typeof enVal, 'string', `Expected string for en.${key}`);
      assert.equal(typeof idVal, 'string', `Expected string for id.${key}`);
      assert.ok((enVal as string).trim().length > 0, `Empty string in en.${key}`);
      assert.ok((idVal as string).trim().length > 0, `Empty string in id.${key}`);
    }
  }
});

test('normalizeAppSettings clamps bounds and restores defaults for invalid values', () => {
  const normalized = normalizeAppSettings({
    language: 'fr',
    theme: 'unknown',
    colorMode: 'sepia',
    textSize: 'xl',
    glassTransparency: 10,
    defaultZoom: 99,
  });

  assert.equal(normalized.language, 'en');
  assert.equal(normalized.theme, DEFAULT_APP_SETTINGS.theme);
  assert.equal(normalized.colorMode, 'light');
  assert.equal(normalized.textSize, 'md');
  assert.equal(normalized.glassTransparency, 65);
  assert.equal(normalized.defaultZoom, 2.5);
});

test('normalizeAppSettings preserves valid Indonesian dark lavender settings', () => {
  const normalized = normalizeAppSettings({
    language: 'id',
    theme: 'lavender',
    colorMode: 'dark',
    textSize: 'lg',
    glassTransparency: 85,
    defaultZoom: 1.5,
  });

  assert.equal(normalized.language, 'id');
  assert.equal(normalized.theme, 'lavender');
  assert.equal(normalized.colorMode, 'dark');
  assert.equal(normalized.textSize, 'lg');
  assert.equal(normalized.glassTransparency, 85);
  assert.equal(normalized.defaultZoom, 1.5);
});

test('classifyCameraError maps standard MediaDevices errors cleanly', () => {
  const denied = new Error('denied');
  denied.name = 'NotAllowedError';
  assert.equal(classifyCameraError(denied), 'permission');

  const inUse = new Error('busy');
  inUse.name = 'NotReadableError';
  assert.equal(classifyCameraError(inUse), 'in-use');

  const missing = new Error('none');
  missing.name = 'NotFoundError';
  assert.equal(classifyCameraError(missing), 'not-found');
});
