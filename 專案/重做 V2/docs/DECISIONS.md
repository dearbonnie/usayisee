# DECISIONS

## Search Results

Search results should open in a results panel instead of expanding under the sidebar. This keeps the interface usable when there are 100-200 clients or many consultation records.

## Sorting

The visible sorting dropdown was removed. `最近諮詢在前` is the default because it best matches real consultation lookup. `建立時間` is more useful for admin auditing than for day-to-day case review, and `諮詢次數` can be added later only if there is a clear workflow need.

## Date Range Search

Date range search now uses the same results panel as keyword search. This keeps keyword and date workflows consistent and avoids long sidebar result lists.

## Date Presets

Date presets were added because practitioners usually search recent activity by natural windows such as `三天內`, `本月`, or `最近三個月`, not by manually choosing two exact dates every time.

## Next Professional Improvements

- Add result density controls: `摘要` and `詳細`, so 100-200 results remain readable.
- Add follow-up status flags: `需追蹤`, `已完成`, `高風險留意`, and `轉介建議`.
- Add autosave status text, because long counseling notes are high-loss-risk content.
- Add export privacy confirmation with export date and file purpose.
- Add a client timeline view, so the practitioner can compare changes across sessions.

## Tarot Lookup

Tarot lookup starts as an external search link, not external content fetching. This avoids CORS failures, copyright ambiguity, and product drift into a full tarot interpretation system. The app remains a counseling record and narrative analysis tool.

## Final Hardening

Autosave status, pending-save flushing, and import overwrite confirmation were prioritized because data loss and accidental overwrite are higher-risk than additional UI features in a counseling record tool.

## Random Tarot Draw

Random draw is intentionally lightweight. It only fills a card name from a local 78-card deck list and does not add automated interpretation. This keeps tarot as an entry prompt while preserving the practitioner's observation workflow.

## Intuitive Tarot Naming

The visible workflow name is `直覺式塔羅牌` because the practitioner interprets cards through intuitive counseling practice. This wording better matches the intended use and reduces pressure to present the tool as a formal tarot-reading system.

## Assisted Card Meaning Lookup

The lookup button is labeled `輔助查牌義` to clarify that external search is only a reference aid. It does not replace the practitioner's intuitive interpretation and does not import external card meanings into the record.

## Search Review Locking

When a client is opened from search results, the app treats it as review mode. The editable workspace is locked so past records cannot be accidentally typed into; the user must choose `新增諮詢` to enter a writable session.

## Intuitive Tarot Deck

The current random draw list is provisional and must not be treated as confirmed Mangala `直覺式塔羅牌` card naming. It should be replaced only after the exact 78 card names from the correct Mangala source are confirmed.

## Formal Sync Mode

The next production direction is Supabase-backed sync, but the UI should continue to depend on a repository interface instead of calling Supabase directly. The first sync release should use explicit manual sync controls and conflict prompts, not silent automatic merging.

## Sync Secrets

Cloud project settings should live in `config.js`, which is intentionally ignored by Git. The repository may include `config.example.js`, but must not include service role keys, database passwords, or private recovery credentials.

## Google Sheets Sync

Google Sheets sync starts as manual push and pull, not automatic background sync. This is safer for consultation records because the user can export a JSON backup before overwriting either the cloud sheet or the current device.
