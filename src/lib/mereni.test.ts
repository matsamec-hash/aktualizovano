import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { UMAMI_ZNACKA, UMAMI_WEB_ID, UMAMI_SKRIPT, UMAMI_DOMENY } from './mereni';

/**
 * Vlastní Umami běží i bez souhlasu v liště, protože nic neukládá do prohlížeče.
 * Test hlídá obě strany té úvahy: značka opravdu nesahá do cookies ani úložiště
 * a zásady o ní říkají pravdu.
 */
describe('měření Umami — běží bez souhlasu, proto nesmí nic ukládat', () => {
  it('značka nesahá do cookies ani do úložiště prohlížeče', () => {
    expect(UMAMI_ZNACKA).not.toMatch(/cookie|localStorage|sessionStorage|indexedDB/i);
  });

  it('míří na vlastní sběrač a na web aktualizovano.cz', () => {
    expect(UMAMI_SKRIPT).toBe('https://analytika.samecdigital.com/script.js');
    expect(UMAMI_WEB_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(UMAMI_ZNACKA).toContain(UMAMI_WEB_ID);
    expect(UMAMI_DOMENY.split(',')).toContain('aktualizovano.cz');
  });

  it('layout značku opravdu vkládá', () => {
    const layout = readFileSync('src/layouts/Base.astro', 'utf8');
    expect(layout).toContain('import { UMAMI_ZNACKA } from "../lib/mereni"');
    expect(layout).toContain('set:html={UMAMI_ZNACKA}');
  });

  it('zásady i cookies zmiňují Umami', () => {
    const zasady = readFileSync('src/pages/zasady-ochrany-osobnich-udaju.astro', 'utf8');
    const cookies = readFileSync('src/pages/cookies.astro', 'utf8');
    expect((zasady.match(/Umami/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(zasady).toContain('analytika.samecdigital.com');
    expect(cookies).toContain('Umami');
  });
});
