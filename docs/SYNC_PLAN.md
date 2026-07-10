# SYNC PLAN

## Goal

Move from single-device `localStorage` storage to optional cross-device sync without changing the counseling workflow abruptly.

## Recommended Sequence

1. Keep the current GitHub Pages app as the stable entry point.
2. Create a Supabase project for the formal sync mode.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Add a local `config.js` from `config.example.js`.
5. Add login and sync repository code behind the existing repository boundary.
6. Test with a small data set before importing real consultation records.

## Sync Boundary

The app should keep this repository pattern:

```text
UI -> repository interface -> localStorage repository or Supabase repository
```

The UI should not call Supabase directly. This keeps the app replaceable later if Google Sheets, Firebase, or another backend becomes preferable.

## Data Ownership

Each cloud record belongs to one authenticated user. A client, session, and all consultation notes must include `owner_id` and be protected by Row Level Security.

## First Sync Behavior

For the first production version, use manual sync controls:

- `同步到雲端`
- `從雲端更新`
- `最後同步時間`
- `同步失敗提示`

Do not silently merge records. If local and cloud versions conflict, show both timestamps and ask the user which one to keep.

## Duplicate Clients

The existing rule remains: do not automatically merge clients. The system may show possible duplicates by name, code, or contact clue, but the user must decide.

## Offline Behavior

The app should continue to open if the network is unavailable. Unsynced changes should remain local and be clearly marked until uploaded.

## Not In Scope Yet

- Real-time collaboration.
- Multiple practitioners editing the same case.
- Automatic conflict merging.
- Uploading images or audio.
- Full tarot interpretation content.
