const SHEETS = {
  CLIENTS: "clients",
  SESSIONS: "sessions",
  SNAPSHOTS: "snapshots",
};

const HEADERS = {
  clients: [
    "id",
    "client_code",
    "client_name",
    "birth_year",
    "contact_info",
    "client_notes",
    "created_at",
    "updated_at",
  ],
  sessions: [
    "id",
    "client_id",
    "session_number",
    "session_date",
    "session_topic",
    "presenting_issue",
    "life_core",
    "pattern_core",
    "custom_blocks",
    "core_sentence",
    "old_pattern",
    "difference",
    "worked",
    "next_adjustment",
    "spread_mode",
    "spread_json",
    "blocks_json",
    "created_at",
    "updated_at",
  ],
  snapshots: ["id", "saved_at", "app_version", "data_json"],
};

function doGet(event) {
  setupSheets();
  const params = event && event.parameter ? event.parameter : {};
  const action = params.action || "";

  if (action === "pull") {
    return jsonResponse({
      ok: true,
      data: readAll(),
      savedAt: new Date().toISOString(),
    }, params.callback);
  }

  return jsonResponse({
    ok: true,
    message: "你說我看見 Google Sheets sync backend is ready.",
    savedAt: new Date().toISOString(),
  }, params.callback);
}

function doPost(event) {
  try {
    setupSheets();
    const body = parseBody(event);
    const action = body.action || "";

    if (action === "pull") {
      return jsonResponse({ ok: true, data: readAll() });
    }

    if (action === "push") {
      if (!body.data || !Array.isArray(body.data.clients)) {
        throw new Error("Missing data.clients");
      }
      writeAll(body.data, body.appVersion || "");
      return jsonResponse({
        ok: true,
        savedAt: new Date().toISOString(),
        counts: {
          clients: body.data.clients.length,
          sessions: countSessions(body.data.clients),
        },
      });
    }

    throw new Error("Unknown action: " + action);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function setupSheets() {
  ensureSheet(SHEETS.CLIENTS, HEADERS.clients);
  ensureSheet(SHEETS.SESSIONS, HEADERS.sessions);
  ensureSheet(SHEETS.SNAPSHOTS, HEADERS.snapshots);
}

function ensureSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0];
  const needsHeaders = current.join("") === "" || current.join("|") !== headers.join("|");

  if (needsHeaders) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function parseBody(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }
  return JSON.parse(event.postData.contents);
}

function writeAll(data, appVersion) {
  const clients = data.clients || [];
  const clientRows = [];
  const sessionRows = [];
  const now = new Date().toISOString();

  clients.forEach((client) => {
    const fields = client.fields || {};
    clientRows.push([
      client.id || "",
      fields.clientCode || "",
      fields.clientName || "",
      fields.birthYear || "",
      fields.contactInfo || "",
      fields.clientNotes || "",
      client.createdAt || "",
      client.updatedAt || "",
    ]);

    (client.sessions || []).forEach((session) => {
      const sessionFields = session.fields || {};
      sessionRows.push([
        session.id || "",
        client.id || "",
        sessionFields.sessionNumber || "",
        sessionFields.sessionDate || "",
        sessionFields.sessionTopic || "",
        sessionFields.presentingIssue || "",
        sessionFields.lifeCore || "",
        sessionFields.patternCore || "",
        sessionFields.customBlocks || "",
        sessionFields.coreSentence || "",
        sessionFields.oldPattern || "",
        sessionFields.difference || "",
        sessionFields.worked || "",
        sessionFields.nextAdjustment || "",
        session.spreadMode || "",
        JSON.stringify(session.spread || {}),
        JSON.stringify(session.blocks || []),
        session.createdAt || "",
        session.updatedAt || "",
      ]);
    });
  });

  replaceRows(SHEETS.CLIENTS, HEADERS.clients, clientRows);
  replaceRows(SHEETS.SESSIONS, HEADERS.sessions, sessionRows);
  appendSnapshot(now, appVersion, data);
}

function replaceRows(sheetName, headers, rows) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function appendSnapshot(savedAt, appVersion, data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.SNAPSHOTS);
  sheet.appendRow([
    Utilities.getUuid(),
    savedAt,
    appVersion,
    JSON.stringify(data),
  ]);
}

function readAll() {
  const clientsById = {};
  const clients = readObjects(SHEETS.CLIENTS).map((row) => {
    const client = {
      id: row.id,
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      fields: {
        clientCode: row.client_code || "",
        clientName: row.client_name || "",
        birthYear: row.birth_year || "",
        contactInfo: row.contact_info || "",
        clientNotes: row.client_notes || "",
      },
      sessions: [],
    };
    clientsById[client.id] = client;
    return client;
  });

  readObjects(SHEETS.SESSIONS).forEach((row) => {
    const client = clientsById[row.client_id];
    if (!client) return;

    client.sessions.push({
      id: row.id,
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      spreadMode: row.spread_mode || "one",
      spread: parseJsonCell(row.spread_json, {}),
      blocks: parseJsonCell(row.blocks_json, []),
      fields: {
        sessionNumber: row.session_number || "",
        sessionDate: row.session_date || "",
        sessionTopic: row.session_topic || "",
        presentingIssue: row.presenting_issue || "",
        lifeCore: row.life_core || "",
        patternCore: row.pattern_core || "",
        customBlocks: row.custom_blocks || "",
        coreSentence: row.core_sentence || "",
        oldPattern: row.old_pattern || "",
        difference: row.difference || "",
        worked: row.worked || "",
        nextAdjustment: row.next_adjustment || "",
      },
    });
  });

  return { clients };
}

function readObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index];
    });
    return object;
  });
}

function parseJsonCell(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function countSessions(clients) {
  return clients.reduce((count, client) => count + ((client.sessions || []).length), 0);
}

function jsonResponse(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
