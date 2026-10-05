import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...srcFiles(full));
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function importSpecifiers(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const out: string[] = [];
  const re = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1]!);
  }
  return out;
}

const domainFiles = srcFiles('src/domain');
const persistenceFiles = srcFiles('src/persistence');

test('domain imports are strictly relative: no persistence, sqlite, expo or react', () => {
  assert.ok(domainFiles.length > 0);
  for (const file of domainFiles) {
    for (const specifier of importSpecifiers(file)) {
      assert.ok(
        specifier.startsWith('.'),
        `${file} imports non-relative module ${JSON.stringify(specifier)}`,
      );
    }
  }
});

test('persistence depends only on the domain, node:sqlite and expo-sqlite', () => {
  assert.ok(persistenceFiles.length > 0);
  for (const file of persistenceFiles) {
    for (const specifier of importSpecifiers(file)) {
      const allowed = specifier.startsWith('.') || specifier === 'node:sqlite' || specifier === 'expo-sqlite';
      assert.ok(allowed, `${file} imports unexpected module ${JSON.stringify(specifier)}`);
    }
  }
});

test('no dynamic imports anywhere in src', () => {
  for (const file of [...domainFiles, ...persistenceFiles]) {
    assert.ok(!readFileSync(file, 'utf8').includes('import('), `${file} uses a dynamic import`);
  }
});

test('no interpolated SQL: template literals with SQL keywords take no placeholders', () => {
  for (const file of persistenceFiles) {
    const text = readFileSync(file, 'utf8');
    const templates = text.match(/`[^`]*`/g) ?? [];
    for (const template of templates) {
      if (/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bPRAGMA\b|\bBEGIN\b|\bCOMMIT\b|\bROLLBACK\b/i.test(template)) {
        assert.ok(!template.includes('${'), `${file} interpolates SQL: ${template.slice(0, 80)}`);
      }
    }
  }
});

test('no logging and no network surface in src', () => {
  for (const file of [...domainFiles, ...persistenceFiles]) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes('console.'), `${file} logs`);
    for (const token of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'child_process']) {
      assert.ok(!text.includes(token), `${file} contains ${token}`);
    }
  }
});
