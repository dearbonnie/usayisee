# GOOGLE SHEETS SYNC SETUP

## Step 1

Open the Google Sheet, then open `Extensions > Apps Script`.

## Step 2

Replace everything in `Code.gs` with the content from:

```text
docs/google-apps-script-backend.gs
```

## Step 3

Click `Save`.

## Step 4

In Apps Script, select the function `setupSheets` and click `Run`.

Google will ask for authorization. Approve the script for your own Google account.

## Step 5

Go back to the Google Sheet. It should now contain these sheets:

- `clients`
- `sessions`
- `snapshots`

## Step 6

In Apps Script, click `Deploy > New deployment`.

Choose:

- Type: `Web app`
- Execute as: `Me`
- Who has access: `Anyone`

Click `Deploy`, then copy the Web app URL.

## Step 7

Send the Web app URL back to Codex so the frontend can be connected to Google Sheets sync.

## Updating Existing Deployment

When the backend code changes:

1. Paste the new `docs/google-apps-script-backend.gs` content into Apps Script.
2. Click `Save`.
3. Click `Deploy > Manage deployments`.
4. Select the existing web app deployment.
5. Click the edit pencil.
6. Set `Version` to `New version`.
7. Click `Deploy`.
8. Keep the same Web app URL unless Google explicitly gives a new one.
