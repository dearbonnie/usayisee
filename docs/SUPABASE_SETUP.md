# SUPABASE SETUP

## Why Supabase

Supabase is a practical first cloud option for this app because it supports:

- Email login.
- PostgreSQL tables.
- Row Level Security.
- Browser access using an anon public key.

## Create Project

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run the SQL in `supabase/schema.sql`.
4. In Authentication settings, choose the sign-in method.
5. Copy only these public browser values:
   - Project URL.
   - Anon public key.

Never use or paste the service role key in this app.

## Local Config

Copy `config.example.js` to `config.js` on the device used for development:

```js
window.USAYISEE_CONFIG = {
  syncProvider: "supabase",
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-public-key",
};
```

`config.js` is ignored by Git so private project settings are not committed accidentally.

## GitHub Pages Note

For a public GitHub Pages app, the anon key is visible to the browser. This is normal for Supabase browser apps, but it only works safely when Row Level Security policies are correct.

Do not add service role keys, database passwords, or personal recovery keys to GitHub.

## Before Real Data

Use fake client records first. Confirm:

- Login works.
- One account cannot read another account's records.
- Local unsynced records are not lost.
- Export still works before and after sync.
