---
created: 2026-05-18T12:30:28.098Z
title: Reset Hostinger FTP password to unblock aktualizovano deploy
area: tooling
files:
  - .github/workflows/deploy.yml
  - .continue-here.md
---

## Problem

Commit `bf0ff18` (WebSite + SearchAction JSON-LD pro Google Sitelinks Search Box) je na GitHub master ale **5 deploy attempts napříč 2 dny všechny fail** s `mirror: Login failed: 530 Login incorrect`:

- 2026-05-16 22:38, 22:42, 22:46 UTC (initial cluster po 7 rapid pushech)
- 2026-05-17 09:19 UTC (scheduled daily rebuild)
- 2026-05-18 11:30 UTC (manual retrigger)

GH secrets timestamp 2026-05-16 nezměněn. Hostinger zřejmě **trvale deaktivoval FTP heslo** po brute-force protection trigger, nebo se heslo změnilo externě. 12+ hour gap mezi pokusy vylučuje rate-limit, jde o credential problem.

Bez nového hesla deploy pipeline mrtvá → SearchAction schema + budoucí změny nelze nasadit na staging.aktualizovano.cz.

## Solution

1. Hostinger panel → **Files → FTP Accounts** → `u570849409.aktualizovano.cz`
2. **Change FTP password** → vygeneruj nové, **vyhni se znakům** `,` `$` `"` `'` `\` (lftp shell escaping breakage)
3. Zkopíruj nové heslo
4. Update GH secret přes web UI: <https://github.com/matsamec-hash/aktualizovano/settings/secrets/actions>
   - Klik `FTP_PASSWORD` → Update → paste → Save secret
5. Trigger deploy: `gh workflow run deploy.yml -R matsamec-hash/aktualizovano`
6. Wait ~3 min, then verify:
   ```bash
   curl -sL https://staging.aktualizovano.cz/ | grep -oE 'application/ld\+json' | wc -l
   ```
   Očekávané: `2` (Organization + WebSite JSON-LD scripts).

Pokud i nový password fail s 530, Hostinger zablokoval celý FTP účet — pak support ticket nebo vytvořit nový FTP account v panelu a swap username v `FTP_USER` secret.

## Reference

- Memory: `~/.claude/projects/-Users-matejsamec-Downloads/memory/feedback_hostinger_ftp_ratelimit.md`
- Memory: `~/.claude/projects/-Users-matejsamec-Downloads/memory/project_aktualizovano.md`
- Handoff: `.continue-here.md` (this repo)
