# CHANGELOG

## v2.2.0 - 2026-07-10

- Added the formal sync preparation documents for Supabase.
- Added a first-pass PostgreSQL schema with Row Level Security policies.
- Added `config.example.js` and `.gitignore` so cloud settings are not accidentally committed.
- Kept the live app behavior on localStorage until sync is explicitly implemented and tested.

## v2.1.4 - 2026-07-10

- Fixed review-mode locking for checkbox controls, including `核心阻塞點解讀`.
- Reapplies workspace locking after the core-block checkbox grid is re-rendered.
- Removed the claim that the current random draw list is confirmed as Mangala's `直覺式塔羅牌`.
- Updated cache version to `20260710-14`.

## v2.1.3 - 2026-07-10

- Replaced the random draw deck with a provisional Thoth-style list; this is not confirmed as Mangala's `直覺式塔羅牌`.
- Renamed spread controls to `翻一張牌` and `翻三張牌`.
- Changed assisted lookup search query to `直覺式塔羅牌 + 牌名 + 牌義`.
- Locked the editable workspace when entering a client through search review mode.
- Updated cache version to `20260710-13`.

## v2.1.2 - 2026-07-10

- Renamed the external card meaning lookup button from `查牌義` to `輔助查牌義`.
- Updated cache version to `20260710-12`.

## v2.1.1 - 2026-07-10

- Renamed the tarot workflow to `直覺式塔羅牌` in the visible UI and exported/session summary labels.
- Removed the temporary `v2.0.9 實體牌版` folder to keep the project directory focused.
- Updated cache version to `20260710-11`.

## v2.1.0 - 2026-07-10

- Temporarily preserved the previous physical-card workflow before it was removed in v2.1.1.
- Added a lightweight `隨機抽牌` button beside each tarot card name field.
- Random draw fills only the selected card-name field and keeps observation notes untouched.
- Updated cache version to `20260710-10`.

## v2.0.9 - 2026-07-10

- Added visible autosave status in the confirmation bar.
- Flushes pending autosave before confirmation, export, and page unload.
- Added a stronger import warning because import replaces local data.
- Avoids service worker registration when opened directly from `file://`.
- Updated cache version to `20260710-09`.

## v2.0.8 - 2026-07-10

- Added a lightweight `查牌義` button beside each tarot card name field.
- The button opens an external search for `塔羅 + 牌名 + 牌義`; no external content is fetched into the app.
- Updated cache version to `20260710-08`.

## v2.0.7 - 2026-07-10

- Added quick date range buttons: `三天內`, `七天內`, `本月`, `最近三個月`, `今年`, and `清除`.
- Date presets fill the start/end date fields and reuse the existing search result panel.
- Updated cache version to `20260710-07`.

## v2.0.6 - 2026-07-10

- Restored the project baseline from the final `outputs/重做 V2` version in the `同步 Codex 跨设备内容` thread.
- Removed the search result sort dropdown.
- Search results now use one professional default: latest consultation first.
- Date range search no longer renders long result lists under the sidebar.
- Added a `查詢時間` button that opens the existing search results panel.
- Updated cache version to `20260710-06`.
