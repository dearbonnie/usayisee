const STORAGE_KEY = "zouzhe-app-v2";
const LEGACY_KEY = "zouzhe-app-v1";
const APP_VERSION = "v2.3.1";
const GOOGLE_SYNC_URL = "https://script.google.com/macros/s/AKfycbyKLJBTYBCkSj2n1yjA2jhAzYypwF_dOSUO0K7nqVBFvF_AQQN-L5taueu0iAmbjy4L/exec";

const blockOptions = [
  "自我價值",
  "被愛／被拋棄恐懼",
  "控制與安全感",
  "罪惡感／責任感",
  "未完成悲傷",
  "父母／家庭角色",
  "執著／放不下",
  "創傷反應",
];

const tarotDeck = [
  "愚者", "魔術師", "女祭司", "女皇", "皇帝", "教皇", "戀人", "戰車", "調整", "隱士",
  "命運", "慾望", "吊人", "死亡", "藝術", "惡魔", "高塔", "星星", "月亮", "太陽",
  "永劫", "宇宙",
  "權杖一", "權杖二 支配", "權杖三 美德", "權杖四 完成", "權杖五 鬥爭", "權杖六 勝利", "權杖七 勇氣", "權杖八 迅速", "權杖九 力量", "權杖十 壓迫",
  "權杖騎士", "權杖皇后", "權杖王子", "權杖公主",
  "聖杯一", "聖杯二 愛", "聖杯三 豐盛", "聖杯四 奢華", "聖杯五 失望", "聖杯六 愉悅", "聖杯七 放縱", "聖杯八 懶惰", "聖杯九 幸福", "聖杯十 飽足",
  "聖杯騎士", "聖杯皇后", "聖杯王子", "聖杯公主",
  "寶劍一", "寶劍二 平和", "寶劍三 悲傷", "寶劍四 休戰", "寶劍五 失敗", "寶劍六 科學", "寶劍七 徒勞", "寶劍八 干擾", "寶劍九 殘酷", "寶劍十 毀滅",
  "寶劍騎士", "寶劍皇后", "寶劍王子", "寶劍公主",
  "圓盤一", "圓盤二 變化", "圓盤三 工作", "圓盤四 權力", "圓盤五 憂慮", "圓盤六 成功", "圓盤七 失敗", "圓盤八 謹慎", "圓盤九 收穫", "圓盤十 財富",
  "圓盤騎士", "圓盤皇后", "圓盤王子", "圓盤公主",
];

const clientFieldIds = ["clientCode", "clientName", "birthYear", "contactInfo", "clientNotes"];
const sessionFieldIds = [
  "sessionNumber",
  "sessionDate",
  "sessionTopic",
  "presentingIssue",
  "lifeCore",
  "patternCore",
  "customBlocks",
  "coreSentence",
  "oldPattern",
  "difference",
  "worked",
  "nextAdjustment",
];

let state = loadState();
let activeClientId = null;
let activeSessionId = null;
let listVisible = false;
let summaryVisible = false;
let saveTimer = null;
let reviewClientId = null;
let reviewSessionId = null;
let lastSearchResults = [];
let hasPendingSave = false;
let workspaceLocked = false;

const $ = (id) => document.getElementById(id);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function compactDate(dateText = today()) {
  return dateText.slice(2, 10).replaceAll("-", "");
}

function generateClientCode(dateText = today(), existingClients = state.clients) {
  const prefix = `ZZ-${compactDate(dateText)}`;
  let sequence = existingClients.length + 1;
  let code = `${prefix}-${String(sequence).padStart(3, "0")}`;
  const usedCodes = new Set(existingClients.map((client) => client.fields?.clientCode).filter(Boolean));
  while (usedCodes.has(code)) {
    sequence += 1;
    code = `${prefix}-${String(sequence).padStart(3, "0")}`;
  }
  return code;
}

function emptySession(number = 1) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    spreadMode: "one",
    spread: {},
    blocks: [],
    fields: {
      sessionNumber: String(number),
      sessionDate: today(),
      sessionTopic: "",
      presentingIssue: "",
      lifeCore: "",
      patternCore: "",
      customBlocks: "",
      coreSentence: "",
      oldPattern: "",
      difference: "",
      worked: "",
      nextAdjustment: "",
    },
  };
}

function createClient(values = {}) {
  const existing = findExistingClient(values);
  if (existing) {
    updateClientProfile(existing, values);
    startFollowUpSession(existing.id);
    return;
  }

  const firstSession = emptySession(1);
  const client = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: {
      clientCode: generateClientCode(),
      clientName: values.clientName || "",
      birthYear: values.birthYear || "",
      contactInfo: values.contactInfo || "",
      clientNotes: values.clientNotes || "",
    },
    sessions: [firstSession],
  };

  state.clients.unshift(client);
  summaryVisible = false;
  activateClient(client.id, firstSession.id, { clearKeyword: true, hideList: true, scrollToWork: true });
  showWorkspace();
  showToast("已建立新個案");
}

function normalizeLookup(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeContact(value = "") {
  return normalizeLookup(value).replace(/[()\-.]/g, "");
}

function findExistingClient(values = {}) {
  const name = normalizeLookup(values.clientName);
  const contact = normalizeContact(values.contactInfo);
  const birthYear = normalizeLookup(values.birthYear);
  if (!name && !contact) return null;

  const candidates = state.clients
    .map((client) => {
      const fields = client.fields || {};
      const sameContact = contact && normalizeContact(fields.contactInfo) === contact;
      const sameName = name && normalizeLookup(fields.clientName) === name;
      const sameBirthYear = birthYear && normalizeLookup(fields.birthYear) === birthYear;
      let score = 0;
      if (sameContact) score += 100;
      if (sameName) score += 40;
      if (sameBirthYear) score += 30;
      return { client, score };
    })
    .filter((item) => item.score >= 70 || (name && item.score >= 40));

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.client.sessions.length !== a.client.sessions.length) return b.client.sessions.length - a.client.sessions.length;
    return (b.client.updatedAt || "").localeCompare(a.client.updatedAt || "");
  });
  return candidates[0].client;
}

function updateClientProfile(client, values = {}) {
  client.fields = client.fields || {};
  if (values.clientName && !client.fields.clientName) client.fields.clientName = values.clientName;
  if (values.birthYear && !client.fields.birthYear) client.fields.birthYear = values.birthYear;
  if (values.contactInfo && !client.fields.contactInfo) client.fields.contactInfo = values.contactInfo;
  if (values.clientNotes && !client.fields.clientNotes) client.fields.clientNotes = values.clientNotes;
  client.updatedAt = new Date().toISOString();
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.clients)) return stored;
  } catch (error) {
    console.warn(error);
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (legacy && Array.isArray(legacy.cases)) return migrateLegacyState(legacy);
  } catch (error) {
    console.warn(error);
  }

  return { clients: [], activeClientId: null, activeSessionId: null };
}

function migrateLegacyState(legacy) {
  const clients = [];
  legacy.cases.forEach((item) => {
    const fields = item.fields || {};
    const code = fields.caseCode || "";
    const session = emptySession(Number(fields.sessionNumber || 1));
    session.id = item.id || session.id;
    session.createdAt = item.createdAt || session.createdAt;
    session.updatedAt = item.updatedAt || session.updatedAt;
    session.spreadMode = item.spreadMode === "three" ? "three" : "one";
    session.spread = item.spread || {};
    session.blocks = item.blocks || [];
    session.fields = {
      sessionNumber: String(fields.sessionNumber || 1),
      sessionDate: fields.sessionDate || today(),
      sessionTopic: fields.sessionTopic || "",
      presentingIssue: fields.presentingIssue || "",
      lifeCore: fields.lifeCore || fields.lifeEvents || "",
      patternCore: fields.patternNotes || fields.patternSummary || "",
      customBlocks: "",
      coreSentence: fields.coreSentence || "",
      oldPattern: fields.oldPattern || "",
      difference: fields.difference || "",
      worked: fields.worked || "",
      nextAdjustment: fields.nextAdjustment || "",
    };

    const existing = clients.find((client) => client.fields.clientCode && client.fields.clientCode === code);
    if (existing) {
      existing.sessions.push(session);
      return;
    }

    clients.push({
      id: crypto.randomUUID(),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      fields: {
        clientCode: code && !code.startsWith("ZZ-") ? code : generateClientCode(fields.sessionDate || today(), clients),
        clientName: fields.clientName || "",
        birthYear: fields.birthYear || "",
        contactInfo: fields.contactInfo || "",
        clientNotes: fields.caseNotes || "",
      },
      sessions: [session],
    });
  });

  return { clients, activeClientId: null, activeSessionId: null };
}

function persist() {
  state.activeClientId = activeClientId;
  state.activeSessionId = activeSessionId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  hasPendingSave = false;
  setSaveStatus("已儲存");
}

function getActiveClient() {
  return state.clients.find((client) => client.id === activeClientId) || null;
}

function getActiveSession() {
  const client = getActiveClient();
  return client?.sessions.find((session) => session.id === activeSessionId) || null;
}

function syncFromForm() {
  const client = getActiveClient();
  const session = getActiveSession();
  if (!client || !session) return;

  clientFieldIds.forEach((id) => {
    client.fields[id] = $(id).value;
  });

  sessionFieldIds.forEach((id) => {
    session.fields[id] = $(id).value;
  });

  session.blocks = Array.from(document.querySelectorAll("[data-block]:checked")).map((input) => input.value);
  session.spread = {};
  document.querySelectorAll("[data-spread-input]").forEach((input) => {
    const { spreadKey, spreadField } = input.dataset;
    session.spread[spreadKey] = session.spread[spreadKey] || {};
    session.spread[spreadKey][spreadField] = input.value;
  });

  session.updatedAt = new Date().toISOString();
  client.updatedAt = new Date().toISOString();
}

function queueSave() {
  summaryVisible = false;
  if ($("summaryPanel")) $("summaryPanel").hidden = true;
  hasPendingSave = true;
  setSaveStatus("儲存中...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    syncFromForm();
    persist();
    renderClientList();
    renderSessionList();
    renderSummary();
  }, 180);
}

function flushPendingSave() {
  if (!hasPendingSave) return;
  clearTimeout(saveTimer);
  syncFromForm();
  persist();
}

function setSaveStatus(message) {
  const status = $("saveStatus");
  if (status) status.textContent = message;
}

function setSyncStatus(message) {
  const status = $("syncStatus");
  if (status) status.textContent = message;
}

function render() {
  renderClientList();
  const hasClient = Boolean(getActiveClient() && getActiveSession());
  if (hasClient) {
    showWorkspace();
  } else {
    showStart();
  }
  $("clientManagement").hidden = !hasClient;
  $("deleteClientButton").disabled = !hasClient;
  if (hasClient) renderForm();
}

function showWorkspace() {
  $("workGrid").hidden = false;
  $("recordReview").hidden = true;
  reviewClientId = null;
  reviewSessionId = null;
}

function showStart() {
  $("workGrid").hidden = true;
  $("recordReview").hidden = true;
}

function clientSearchText(client) {
  return [
    client.fields.clientCode,
    client.fields.clientName,
    client.fields.birthYear,
    client.fields.contactInfo,
    client.fields.clientNotes,
    ...client.sessions.flatMap((session) => [
      session.fields.sessionDate,
      session.fields.sessionTopic,
      session.fields.presentingIssue,
      session.fields.lifeCore,
      session.fields.patternCore,
      session.fields.customBlocks,
      session.fields.coreSentence,
      session.fields.oldPattern,
      session.fields.difference,
      session.fields.worked,
      session.fields.nextAdjustment,
      ...(session.blocks || []),
      ...Object.values(session.spread || {}).flatMap((spread) => [spread.card, spread.observation]),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function sessionSearchText(session) {
  return [
    session.fields.sessionDate,
    session.fields.sessionTopic,
    session.fields.presentingIssue,
    session.fields.lifeCore,
    session.fields.patternCore,
    session.fields.customBlocks,
    session.fields.coreSentence,
    session.fields.oldPattern,
    session.fields.difference,
    session.fields.worked,
    session.fields.nextAdjustment,
    ...(session.blocks || []),
    ...Object.values(session.spread || {}).flatMap((spread) => [spread.card, spread.observation]),
  ]
    .join(" ")
    .toLowerCase();
}

function getKeywordTokens() {
  return $("keywordInput").value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function clientMatchesKeyword(client, tokens = getKeywordTokens()) {
  if (!tokens.length) return true;
  const searchText = clientSearchText(client);
  return tokens.every((token) => searchText.includes(token));
}

function buildSearchResults() {
  const tokens = getKeywordTokens();
  const start = $("rangeStart").value;
  const end = $("rangeEnd").value;
  const hasKeyword = tokens.length > 0;
  const hasRange = Boolean(start || end);
  if (!hasKeyword && !hasRange) return [];

  return state.clients.flatMap((client) => {
    normalizeClient(client);
    const clientText = [
      client.fields.clientCode,
      client.fields.clientName,
      client.fields.birthYear,
      client.fields.contactInfo,
      client.fields.clientNotes,
    ].join(" ").toLowerCase();
    const clientHit = hasKeyword && tokens.every((token) => clientText.includes(token));

    return client.sessions
      .filter((session) => {
        const date = session.fields.sessionDate;
        if (start && (!date || date < start)) return false;
        if (end && (!date || date > end)) return false;
        if (!hasKeyword) return true;
        const text = `${clientText} ${sessionSearchText(session)}`;
        return tokens.every((token) => text.includes(token));
      })
      .map((session) => ({
        client,
        session,
        clientHit,
        hitText: buildHitText(client, session, tokens),
      }));
  });
}

function renderClientList() {
  const tokens = getKeywordTokens();
  const list = $("clientList");
  if (!listVisible && !tokens.length) {
    list.innerHTML = "";
    list.hidden = true;
    lastSearchResults = buildSearchResults();
    updateSearchGuide();
    return;
  }

  lastSearchResults = buildSearchResults();
  const clients = uniqueClients(lastSearchResults.map((item) => item.client));
  list.hidden = false;
  list.innerHTML = "";

  clients.forEach((client) => {
    const latest = latestSession(client);
    const item = document.createElement("article");
    item.className = `client-item${client.id === activeClientId ? " active" : ""}`;
    item.innerHTML = `
      <div class="client-item-main">
        <strong>${escapeHtml(client.fields.clientCode || "系統代碼產生中")}</strong>
        <span>${escapeHtml(client.fields.clientName || "尚未填寫姓名／稱呼")}</span>
        <span>${escapeHtml(client.fields.contactInfo || "尚未填寫聯繫方式")}</span>
        <span>共 ${client.sessions.length} 次 · 最近 ${escapeHtml(latest?.fields.sessionDate || "")}</span>
      </div>
      <div class="client-item-actions">
        <button class="ghost-button compact" type="button" data-action="view">查看紀錄</button>
        <button class="primary-button compact" type="button" data-action="again">再次諮詢</button>
      </div>
    `;
    item.querySelector("[data-action='view']").addEventListener("click", () => {
      syncFromForm();
      showRecordReview(client.id, latest?.id || client.sessions[0]?.id || null);
    });
    item.querySelector("[data-action='again']").addEventListener("click", () => startFollowUpSession(client.id));
    list.appendChild(item);
  });
  updateSearchGuide({ keywordCount: clients.length, resultCount: lastSearchResults.length });
}

function renderForm() {
  const client = getActiveClient();
  const session = getActiveSession();
  normalizeClient(client);

  clientFieldIds.forEach((id) => {
    $(id).value = client.fields[id] || "";
  });

  sessionFieldIds.forEach((id) => {
    $(id).value = session.fields[id] || "";
  });

  renderSessionList();
  renderSpread();
  renderBlocks();
  renderSummary();
}

function renderSessionList() {
  const client = getActiveClient();
  if (!client) return;

  const list = $("sessionList");
  list.innerHTML = "";
  [...client.sessions]
    .sort((a, b) => Number(a.fields.sessionNumber) - Number(b.fields.sessionNumber))
    .forEach((session) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `session-item${session.id === activeSessionId ? " active" : ""}`;
      button.innerHTML = `
        <strong>第 ${escapeHtml(session.fields.sessionNumber || "1")} 次</strong>
        <span>${escapeHtml(session.fields.sessionDate || "")}</span>
        <span>${escapeHtml(session.fields.sessionTopic || "尚未填寫主題")}</span>
      `;
      button.addEventListener("click", () => {
        syncFromForm();
        summaryVisible = false;
        activeSessionId = session.id;
        persist();
        render();
      });
      list.appendChild(button);
    });
}

function renderSpread() {
  const session = getActiveSession();
  const mode = session.spreadMode || "one";
  $("spreadOneButton").classList.toggle("active", mode === "one");
  $("spreadThreeButton").classList.toggle("active", mode === "three");

  const slots = mode === "three"
    ? [["turn1", "翻牌 1"], ["turn2", "翻牌 2"], ["turn3", "翻牌 3"]]
    : [["turn1", "翻牌"]];

  $("spreadGrid").innerHTML = "";
  slots.forEach(([key, title]) => {
    const values = session.spread[key] || {};
    const slot = document.createElement("div");
    slot.className = "card-slot";
    slot.innerHTML = `
      <h4>${title}</h4>
      <label>
        牌名
        <div class="card-name-action">
          <input data-spread-input data-spread-key="${key}" data-spread-field="card" type="text" value="${escapeAttr(values.card || "")}" />
          <button class="ghost-button compact" data-card-draw="${key}" type="button">隨機抽牌</button>
          <button class="ghost-button compact" data-card-lookup="${key}" type="button">輔助查牌義</button>
        </div>
      </label>
      <label>
        自他觀察
        <textarea data-spread-input data-spread-key="${key}" data-spread-field="observation" rows="2">${escapeHtml(values.observation || "")}</textarea>
      </label>
    `;
    $("spreadGrid").appendChild(slot);
  });

  document.querySelectorAll("[data-spread-input]").forEach((input) => input.addEventListener("input", queueSave));
  document.querySelectorAll("[data-card-draw]").forEach((button) => {
    button.addEventListener("click", () => drawRandomCard(button.dataset.cardDraw));
  });
  document.querySelectorAll("[data-card-lookup]").forEach((button) => {
    button.addEventListener("click", () => openCardLookup(button.dataset.cardLookup));
  });
}

function drawRandomCard(key) {
  const input = document.querySelector(`[data-spread-key="${key}"][data-spread-field="card"]`);
  if (!input) return;
  const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
  input.value = card;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  showToast(`已抽到：${card}`);
}

function openCardLookup(key) {
  const input = document.querySelector(`[data-spread-key="${key}"][data-spread-field="card"]`);
  const cardName = input?.value.trim();
  if (!cardName) {
    showToast("請先輸入牌名");
    input?.focus();
    return;
  }
  const query = encodeURIComponent(`直覺式塔羅牌 ${cardName} 牌義`);
  window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
}

function renderBlocks() {
  const session = getActiveSession();
  $("blockGrid").innerHTML = "";
  getBlockOptions(session).forEach((name) => {
    const label = document.createElement("label");
    label.className = "check-tile";
    label.innerHTML = `
      <input data-block type="checkbox" value="${escapeAttr(name)}" ${session.blocks.includes(name) ? "checked" : ""} />
      <span>${escapeHtml(name)}</span>
    `;
    $("blockGrid").appendChild(label);
  });
  document.querySelectorAll("[data-block]").forEach((input) => input.addEventListener("change", queueSave));
  setWorkspaceLocked(workspaceLocked);
}

function getCustomBlockOptions(session) {
  const raw = session?.fields?.customBlocks || "";
  return raw
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBlockOptions(session) {
  return [...new Set([...blockOptions, ...getCustomBlockOptions(session), ...(session?.blocks || [])])];
}

function addCustomBlock() {
  const session = getActiveSession();
  if (!session) return;
  const values = $("customBlockDraft").value
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.length) {
    showToast("請先輸入自訂核心標籤");
    return;
  }

  syncFromForm();
  const customBlocks = new Set(getCustomBlockOptions(session));
  session.blocks = session.blocks || [];
  values.forEach((value) => {
    customBlocks.add(value);
    if (!session.blocks.includes(value)) session.blocks.push(value);
  });
  session.fields.customBlocks = [...customBlocks].join("、");
  $("customBlocks").value = session.fields.customBlocks;
  $("customBlockDraft").value = "";
  session.updatedAt = new Date().toISOString();
  const client = getActiveClient();
  if (client) client.updatedAt = new Date().toISOString();
  persist();
  renderBlocks();
  renderSummary();
  showToast("已新增自訂核心標籤");
}

function addSession() {
  syncFromForm();
  const client = getActiveClient();
  if (!client) return;
  startFollowUpSession(client.id);
}

function startFollowUpSession(clientId) {
  syncFromForm();
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;
  normalizeClient(client);
  const nextNumber = Math.max(...client.sessions.map((session) => Number(session.fields.sessionNumber || 0))) + 1;
  const session = emptySession(nextNumber);
  client.sessions.push(session);
  activateClient(client.id, session.id, { clearKeyword: true, hideList: true, scrollToWork: true });
  summaryVisible = false;
  showToast(`已進入第 ${nextNumber} 次諮詢`);
}

function deleteClient() {
  const client = getActiveClient();
  if (!client) return;
  const label = client.fields.clientCode || client.fields.clientName || "這位個案";
  if (!confirm(`確定刪除「${label}」與全部諮詢紀錄？`)) return;
  state.clients = state.clients.filter((item) => item.id !== client.id);
  activeClientId = null;
  activeSessionId = null;
  summaryVisible = false;
  persist();
  render();
  showToast("已刪除個案");
}

function deleteReviewClient() {
  const client = state.clients.find((item) => item.id === reviewClientId);
  if (!client) return;
  const code = client.fields.clientCode || "";
  if (!code) {
    showToast("此個案缺少代號，未刪除");
    return;
  }
  const label = code || client.fields.clientName || "這位個案";
  const sessionCount = client.sessions?.length || 0;
  const typed = prompt(`確定刪除「${label}」與全部 ${sessionCount} 次諮詢紀錄？\n\n若要刪除，請輸入個案代號：${code}`);

  if (typed === null) return;
  if (typed.trim() !== code) {
    showToast("個案代號不一致，未刪除");
    return;
  }

  state.clients = state.clients.filter((item) => item.id !== client.id);
  activeClientId = null;
  activeSessionId = null;
  reviewClientId = null;
  reviewSessionId = null;
  summaryVisible = false;
  lastSearchResults = buildSearchResults();
  persist();
  $("recordReview").hidden = true;
  $("workGrid").hidden = true;
  renderClientList();
  renderRangeResults();
  updateSearchGuide();
  setSyncStatus("已刪除，請同步到 Google Sheets");
  showToast("已刪除個案，請同步到 Google Sheets");
}

function exportData() {
  flushPendingSave();
  syncFromForm();
  if (!confirm("備份會包含個案資料、聯繫方式與諮詢紀錄。請確認會妥善保存這個檔案。")) return;
  persist();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `你來 我聽 你說 我看見備份-${today()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  if (!confirm("匯入備份會取代目前這台裝置中的資料。請確認已先匯出目前資料，或確定要覆蓋。")) {
    $("importInput").value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      state = incoming.clients ? incoming : migrateLegacyState(incoming);
      activeClientId = null;
      activeSessionId = null;
      summaryVisible = false;
      persist();
      render();
      showToast("備份已匯入");
    } catch (error) {
      showToast("備份格式無法讀取");
    }
    $("importInput").value = "";
  };
  reader.readAsText(file);
}

function buildSyncPayload() {
  flushPendingSave();
  syncFromForm();
  persist();
  return {
    clients: state.clients,
    activeClientId,
    activeSessionId,
  };
}

async function pushToGoogleSheets() {
  if (!confirm("同步到 Google Sheets 會用目前這台裝置的資料覆蓋雲端表格。建議先按「匯出備份」保存一份 JSON。確定要同步？")) return;
  const payload = buildSyncPayload();
  setSyncStatus("同步到 Google Sheets 中...");

  try {
    await fetch(GOOGLE_SYNC_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "push",
        appVersion: APP_VERSION,
        data: payload,
      }),
    });
    setSyncStatus(`已送出 ${formatDateTime(new Date())}`);
    showToast("已送出同步");
  } catch (error) {
    console.warn(error);
    setSyncStatus("同步失敗，請稍後再試");
    showToast("同步失敗");
  }
}

async function pullFromGoogleSheets() {
  if (!confirm("從 Google Sheets 更新會取代目前這台裝置中的資料。請先確認已匯出備份或已同步到雲端。確定要更新？")) return;
  setSyncStatus("從 Google Sheets 更新中...");

  try {
    const response = await loadGoogleSyncJsonp();
    if (!response.ok || !response.data || !Array.isArray(response.data.clients)) {
      throw new Error(response.error || "Invalid sync response");
    }

    state = {
      clients: response.data.clients,
      activeClientId: null,
      activeSessionId: null,
    };
    state.clients.forEach(normalizeClient);
    activeClientId = null;
    activeSessionId = null;
    reviewClientId = null;
    reviewSessionId = null;
    summaryVisible = false;
    persist();
    render();
    setSyncStatus(`已更新 ${formatDateTime(new Date())}`);
    showToast("已從 Google Sheets 更新");
  } catch (error) {
    console.warn(error);
    setSyncStatus("更新失敗，請確認 Apps Script 已重新部署");
    showToast("更新失敗");
  }
}

function loadGoogleSyncJsonp() {
  const callbackName = `usayiseeSync_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const url = `${GOOGLE_SYNC_URL}?action=pull&callback=${encodeURIComponent(callbackName)}`;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets sync timeout"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheets sync script failed"));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

function formatDateTime(date) {
  const dateText = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateText} ${hours}:${minutes}`;
}

function runKeywordQuery() {
  listVisible = true;
  renderClientList();
  const tokens = getKeywordTokens();
  if (!tokens.length) {
    showToast("已顯示所有個案");
    return;
  }

  const matches = state.clients.filter((client) => clientMatchesKeyword(client, tokens));
  showToast(`找到 ${matches.length} 筆個案`);
}

function renderRangeResults() {
  syncFromForm();
  const start = $("rangeStart").value;
  const end = $("rangeEnd").value;

  if (!start && !end) {
    lastSearchResults = buildSearchResults();
    updateSearchGuide();
    return;
  }

  lastSearchResults = buildSearchResults();
  const matches = uniqueClients(lastSearchResults.map((item) => item.client)).map((client) => ({
    client,
    sessions: lastSearchResults.filter((item) => item.client.id === client.id).map((item) => item.session),
  }));

  if (!matches.length) {
    updateSearchGuide({ rangeCount: 0, resultCount: 0 });
    return;
  }

  updateSearchGuide({ rangeCount: matches.length, resultCount: lastSearchResults.length });
}

function updateSearchGuide(counts = {}) {
  const guide = $("sidebarGuide");
  const title = guide.querySelector("strong");
  const body = guide.querySelector("span");
  const openButton = $("openSearchResultsButton");
  const tokens = getKeywordTokens();
  const start = $("rangeStart").value;
  const end = $("rangeEnd").value;
  const hasKeyword = tokens.length > 0;
  const hasRange = Boolean(start || end);
  guide.classList.remove("is-active", "is-empty");

  if (!hasKeyword && !hasRange) {
    title.textContent = "先建立個案或諮詢既有資料";
    body.textContent = "可輸入姓名、代號、主題、佛教、靈性等關鍵字，也可用時間區間找到個案。";
    openButton.hidden = true;
    return;
  }

  if (!lastSearchResults.length) lastSearchResults = buildSearchResults();
  const clientCount = uniqueClients(lastSearchResults.map((item) => item.client)).length;
  const resultCount = typeof counts.resultCount === "number" ? counts.resultCount : lastSearchResults.length;
  const keywordCount = typeof counts.keywordCount === "number"
    ? counts.keywordCount
    : hasKeyword
      ? clientCount
      : null;
  const rangeCount = typeof counts.rangeCount === "number"
    ? counts.rangeCount
    : hasRange
      ? clientCount
      : null;
  const parts = [];
  if (keywordCount !== null) parts.push(`關鍵字 ${keywordCount} 筆`);
  if (rangeCount !== null) parts.push(`時間區間 ${rangeCount} 筆`);
  const hasResult = resultCount > 0;
  guide.classList.add(hasResult ? "is-active" : "is-empty");
  title.textContent = hasResult ? "已找到相關個案" : "目前查無符合個案";
  body.textContent = hasResult
    ? `${parts.join("，")}，共 ${resultCount} 筆命中紀錄。可開啟結果面板查看命中片段。`
    : "可換一組關鍵字、放寬日期，或直接建立新個案。";
  openButton.hidden = !hasResult;
}

function uniqueClients(clients) {
  const seen = new Set();
  return clients.filter((client) => {
    if (!client || seen.has(client.id)) return false;
    seen.add(client.id);
    return true;
  });
}

function buildHitText(client, session, tokens) {
  if (!tokens.length) return "";
  const fields = [
    ["個案資料", [client.fields.clientCode, client.fields.clientName, client.fields.birthYear, client.fields.contactInfo, client.fields.clientNotes].join(" ")],
    ["本次主題", session.fields.sessionTopic],
    ["想解決的問題", session.fields.presentingIssue],
    ["生命故事", session.fields.lifeCore],
    ["模式分析", session.fields.patternCore],
    ["核心阻塞點", [session.fields.customBlocks, session.fields.coreSentence, ...(session.blocks || [])].join(" ")],
    ["追蹤結果", [session.fields.oldPattern, session.fields.difference, session.fields.worked, session.fields.nextAdjustment].join(" ")],
    ["直覺式塔羅牌", Object.values(session.spread || {}).map((spread) => `${spread.card || ""} ${spread.observation || ""}`).join(" ")],
  ];
  const hit = fields.find(([, value]) => {
    const text = String(value || "").toLowerCase();
    return tokens.some((token) => text.includes(token));
  });
  if (!hit) return "";
  return `${hit[0]}：${trimHitText(hit[1], tokens)}`;
}

function trimHitText(value, tokens) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (text.length <= 86) return text;
  const lower = text.toLowerCase();
  const index = Math.max(0, tokens.map((token) => lower.indexOf(token)).filter((item) => item >= 0).sort((a, b) => a - b)[0] || 0);
  const start = Math.max(0, index - 28);
  return `${start > 0 ? "..." : ""}${text.slice(start, start + 86)}${start + 86 < text.length ? "..." : ""}`;
}

function highlightTokens(value, tokens = getKeywordTokens()) {
  let html = escapeHtml(value || "");
  tokens.forEach((token) => {
    if (!token) return;
    const pattern = new RegExp(escapeRegExp(escapeHtml(token)), "gi");
    html = html.replace(pattern, (match) => `<mark>${match}</mark>`);
  });
  return html;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderSummary() {
  const client = getActiveClient();
  const session = getActiveSession();
  if (!client || !session) return;
  const c = client.fields;
  const f = session.fields;
  const sections = extractSessionSections(session);

  $("sessionSummary").textContent = [
    `個案代號：${c.clientCode || ""}`,
    `姓名／稱呼：${c.clientName || ""}`,
    `出生年：${c.birthYear || ""}`,
    `聯繫方式：${c.contactInfo || ""}`,
    `日期：${f.sessionDate || ""}`,
    `第幾次諮詢：${f.sessionNumber || ""}`,
    `本次主題：${f.sessionTopic || ""}`,
    `備註：${c.clientNotes || ""}`,
    "",
    "想解決的問題",
    sections.presentingIssue,
    "",
    "直覺式塔羅牌",
    sections.tarot,
    "",
    "生命故事",
    sections.life,
    "",
    "模式分析",
    sections.pattern,
    "",
    "核心阻塞點",
    sections.blocks,
    "",
    "下次觀察",
    sections.followUp,
  ].join("\n");
  $("summaryPanel").hidden = !summaryVisible;
}

function extractSessionSections(session) {
  const f = session.fields || {};
  const spreadLines = Object.values(session.spread || {})
    .filter((item) => item.card || item.observation)
    .map((item) => `${item.card || "未填牌名"}：${item.observation || ""}`);
  const tags = [...new Set([...(session.blocks || []), ...getCustomBlockOptions(session)])].filter(Boolean).join("、");
  const followUp = [
    f.oldPattern ? `舊模式：${f.oldPattern}` : "",
    f.difference ? `不同處：${f.difference}` : "",
    f.worked ? `有效策略：${f.worked}` : "",
    f.nextAdjustment ? `下一步：${f.nextAdjustment}` : "",
  ].filter(Boolean);

  return {
    presentingIssue: f.presentingIssue || "尚未填寫",
    tarot: spreadLines.join("\n") || "尚未填寫",
    life: f.lifeCore || "尚未填寫",
    pattern: f.patternCore || "尚未填寫",
    blocks: [tags, f.coreSentence].filter(Boolean).join("\n") || "尚未填寫",
    followUp: followUp.join("\n") || "尚未填寫",
  };
}

function showRecordReview(clientId, sessionId) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;
  normalizeClient(client);
  setWorkspaceLocked(true);
  reviewClientId = client.id;
  reviewSessionId = sessionId || latestSession(client)?.id || client.sessions[0]?.id || null;
  activeClientId = null;
  activeSessionId = null;
  summaryVisible = false;
  $("workGrid").hidden = true;
  $("recordReview").hidden = false;
  $("clientManagement").hidden = true;
  renderRecordReview();
  requestAnimationFrame(() => {
    $("recordReview").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function openSearchResults() {
  lastSearchResults = buildSearchResults();
  renderSearchResults();
  $("searchResultsModal").hidden = false;
}

function openRangeResults() {
  renderRangeResults();
  openSearchResults();
}

function applyRangePreset(preset) {
  const now = new Date();
  let start = "";
  let end = formatDate(now);

  if (preset === "3days") start = formatDate(addDays(now, -2));
  if (preset === "7days") start = formatDate(addDays(now, -6));
  if (preset === "thisMonth") start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  if (preset === "3months") start = formatDate(addMonths(now, -3));
  if (preset === "thisYear") start = formatDate(new Date(now.getFullYear(), 0, 1));
  if (preset === "clear") {
    start = "";
    end = "";
  }

  $("rangeStart").value = start;
  $("rangeEnd").value = end;
  renderRangeResults();
}

function closeSearchResults() {
  $("searchResultsModal").hidden = true;
}

function sortSearchResults(results) {
  return [...results].sort((a, b) => {
    return (b.session.fields.sessionDate || "").localeCompare(a.session.fields.sessionDate || "")
      || Number(b.session.fields.sessionNumber || 0) - Number(a.session.fields.sessionNumber || 0);
  });
}

function renderSearchResults() {
  const list = $("searchResultsList");
  const tokens = getKeywordTokens();
  const results = sortSearchResults(lastSearchResults.length ? lastSearchResults : buildSearchResults());
  const clientCount = uniqueClients(results.map((item) => item.client)).length;
  $("resultsCountText").textContent = `${clientCount} 位個案，${results.length} 筆命中紀錄`;
  list.innerHTML = "";
  if (!results.length) {
    list.innerHTML = `<p class="muted-line">目前沒有符合的個案資料。</p>`;
    return;
  }

  results.forEach(({ client, session, hitText }) => {
    const card = document.createElement("article");
    card.className = `result-card${hitText ? " has-hit" : ""}`;
    card.innerHTML = `
      <div class="result-main">
        <div class="result-title">${escapeHtml(client.fields.clientCode || "系統代碼產生中")}</div>
        <div class="result-meta">
          <span>${escapeHtml(client.fields.clientName || "尚未填寫姓名／稱呼")} · 共 ${client.sessions.length} 次諮詢</span>
          <span>${escapeHtml(session.fields.sessionDate || "未填日期")} · 第 ${escapeHtml(session.fields.sessionNumber || "1")} 次 · ${escapeHtml(session.fields.sessionTopic || "尚未填寫主題")}</span>
        </div>
        ${hitText ? `<div class="result-hit">${highlightTokens(hitText, tokens)}</div>` : ""}
      </div>
      <div class="result-actions">
        <button class="ghost-button compact" type="button" data-action="view">查看摘要</button>
        <button class="primary-button compact" type="button" data-action="again">新增諮詢</button>
      </div>
    `;
    card.querySelector("[data-action='view']").addEventListener("click", () => {
      closeSearchResults();
      showRecordReview(client.id, session.id);
    });
    card.querySelector("[data-action='again']").addEventListener("click", () => {
      closeSearchResults();
      startFollowUpSession(client.id);
    });
    list.appendChild(card);
  });
}

function renderRecordReview() {
  const client = state.clients.find((item) => item.id === reviewClientId);
  if (!client) return;
  const sessions = [...client.sessions].sort((a, b) => Number(a.fields.sessionNumber || 0) - Number(b.fields.sessionNumber || 0));
  const session = sessions.find((item) => item.id === reviewSessionId) || sessions[0];
  if (!session) return;
  reviewSessionId = session.id;
  const f = session.fields || {};
  const sections = extractSessionSections(session);
  const title = client.fields.clientName || client.fields.clientCode || "個案";

  $("reviewTitle").textContent = `${title} 的諮詢紀錄`;
  $("reviewCount").textContent = `共 ${sessions.length} 次`;
  $("reviewMeta").innerHTML = `
    <span>${escapeHtml(client.fields.clientCode || "")}</span>
    <span>第 ${escapeHtml(f.sessionNumber || "1")} 次</span>
    <span>${escapeHtml(f.sessionDate || "")}</span>
    <span>${escapeHtml(f.sessionTopic || "尚未填寫主題")}</span>
  `;
  $("reviewProfile").innerHTML = [
    ["姓名／稱呼", client.fields.clientName || "尚未填寫"],
    ["出生年", client.fields.birthYear || "尚未填寫"],
    ["聯繫方式", client.fields.contactInfo || "尚未填寫"],
    ["備註", client.fields.clientNotes || "尚未填寫"],
  ]
    .map(([label, value]) => `
      <div>
        <strong>${label}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    `)
    .join("");
  $("reviewSections").innerHTML = [
    ["當事人想解決的問題", sections.presentingIssue],
    ["直覺式塔羅牌", sections.tarot],
    ["生命故事解讀", sections.life],
    ["模式分析解讀", sections.pattern],
    ["核心阻塞點解讀", sections.blocks],
    ["追蹤結果", sections.followUp],
  ]
    .map(([heading, body]) => `
      <article class="review-section">
        <h4>${heading}</h4>
        <p>${escapeHtml(body).replaceAll("\n", "<br />")}</p>
      </article>
    `)
    .join("");
  $("reviewSessionNav").innerHTML = sessions
    .map((item) => `
      <button class="ghost-button compact${item.id === session.id ? " active" : ""}" type="button" data-review-session="${escapeAttr(item.id)}">
        第${escapeHtml(item.fields.sessionNumber || "1")}次
      </button>
    `)
    .join("");
  document.querySelectorAll("[data-review-session]").forEach((button) => {
    button.addEventListener("click", () => {
      reviewSessionId = button.dataset.reviewSession;
      renderRecordReview();
    });
  });
}

function returnToSearch() {
  reviewClientId = null;
  reviewSessionId = null;
  $("recordReview").hidden = true;
  $("workGrid").hidden = true;
  renderClientList();
  renderRangeResults();
  updateSearchGuide();
  requestAnimationFrame(() => {
    $("keywordInput").focus();
  });
}

function startReviewFollowUpSession() {
  if (!reviewClientId) return;
  startFollowUpSession(reviewClientId);
}

async function copySummary() {
  try {
    await navigator.clipboard.writeText($("sessionSummary").textContent);
    showToast("摘要已複製");
  } catch (error) {
    showToast("目前無法複製");
  }
}

function latestSession(client) {
  return [...client.sessions].sort((a, b) => Number(b.fields.sessionNumber || 0) - Number(a.fields.sessionNumber || 0))[0];
}

function latestSessionFrom(sessions = []) {
  return [...sessions].sort((a, b) => {
    const dateCompare = (b.fields.sessionDate || "").localeCompare(a.fields.sessionDate || "");
    if (dateCompare !== 0) return dateCompare;
    return Number(b.fields.sessionNumber || 0) - Number(a.fields.sessionNumber || 0);
  })[0] || null;
}

function normalizeClient(client) {
  client.fields = client.fields || {};
  if (!client.fields.clientCode) {
    client.fields.clientCode = generateClientCode(client.createdAt?.slice(0, 10) || today());
  }
  clientFieldIds.forEach((id) => {
    if (typeof client.fields[id] === "undefined") client.fields[id] = "";
  });
  client.sessions = client.sessions?.length ? client.sessions : [emptySession(1)];
  client.sessions.forEach((session, index) => {
    session.fields = session.fields || {};
    sessionFieldIds.forEach((id) => {
      if (typeof session.fields[id] === "undefined") session.fields[id] = "";
    });
    if (!session.fields.sessionNumber) session.fields.sessionNumber = String(index + 1);
    session.spreadMode = session.spreadMode === "three" ? "three" : "one";
    session.spread = session.spread || {};
    session.blocks = [...new Set((session.blocks || []).filter(Boolean))];
  });
}

function setSpreadMode(mode) {
  const session = getActiveSession();
  if (!session) return;
  syncFromForm();
  session.spreadMode = mode;
  persist();
  renderSpread();
}

function activateClient(clientId, sessionId, options = {}) {
  setWorkspaceLocked(false);
  reviewClientId = null;
  reviewSessionId = null;
  activeClientId = clientId;
  activeSessionId = sessionId;
  summaryVisible = false;
  if (options.clearKeyword) $("keywordInput").value = "";
  if (options.hideList) {
    listVisible = false;
    $("clientList").innerHTML = "";
    $("clientList").hidden = true;
  }
  persist();
  render();
  if (options.scrollToWork) focusWorkflow();
}

function setWorkspaceLocked(locked) {
  workspaceLocked = locked;
  document.querySelectorAll("#workGrid input, #workGrid textarea").forEach((field) => {
    if (field.type === "checkbox") {
      field.disabled = locked;
    } else {
      field.readOnly = locked;
    }
  });
  document.querySelectorAll("#workGrid select").forEach((field) => {
    field.disabled = locked;
  });
  document.querySelectorAll("#workGrid button").forEach((button) => {
    if (button.id === "cancelSessionButton") return;
    button.disabled = locked;
  });
  $("workGrid")?.classList.toggle("is-readonly", locked);
}

function confirmSession() {
  flushPendingSave();
  syncFromForm();
  persist();
  summaryVisible = true;
  renderSummary();
  requestAnimationFrame(() => {
    $("summaryPanel").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function cancelSessionConfirm() {
  summaryVisible = false;
  renderSummary();
  showToast("已取消本次確認");
}

function focusWorkflow() {
  requestAnimationFrame(() => {
    $("clientCode").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function openClientModal() {
  ["modalClientName", "modalContactInfo", "modalBirthYear", "modalClientNotes"].forEach((id) => {
    $(id).value = "";
  });
  $("clientModal").hidden = false;
  $("modalClientName").focus();
}

function closeClientModal() {
  $("clientModal").hidden = true;
}

function submitClientModal(event) {
  event.preventDefault();
  const values = {
    clientName: $("modalClientName").value.trim(),
    contactInfo: $("modalContactInfo").value.trim(),
    birthYear: $("modalBirthYear").value.trim(),
    clientNotes: $("modalClientNotes").value.trim(),
  };
  closeClientModal();
  createClient(values);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function bindEvents() {
  $("headerNewClientButton").addEventListener("click", openClientModal);
  $("clientForm").addEventListener("submit", submitClientModal);
  $("closeClientModalButton").addEventListener("click", closeClientModal);
  $("cancelClientModalButton").addEventListener("click", closeClientModal);
  $("clientModal").addEventListener("click", (event) => {
    if (event.target === $("clientModal")) closeClientModal();
  });
  $("deleteClientButton").addEventListener("click", deleteClient);
  $("exportButton").addEventListener("click", exportData);
  $("importInput").addEventListener("change", (event) => importData(event.target.files[0]));
  $("pushSyncButton").addEventListener("click", pushToGoogleSheets);
  $("pullSyncButton").addEventListener("click", pullFromGoogleSheets);
  $("keywordInput").addEventListener("input", () => {
    listVisible = Boolean($("keywordInput").value.trim());
    lastSearchResults = buildSearchResults();
    renderClientList();
    renderRangeResults();
  });
  $("rangeStart").addEventListener("change", renderRangeResults);
  $("rangeEnd").addEventListener("change", renderRangeResults);
  document.querySelectorAll("[data-range-preset]").forEach((button) => {
    button.addEventListener("click", () => applyRangePreset(button.dataset.rangePreset));
  });
  $("openRangeResultsButton").addEventListener("click", openRangeResults);
  $("openSearchResultsButton").addEventListener("click", openSearchResults);
  $("closeSearchResultsButton").addEventListener("click", closeSearchResults);
  $("searchResultsModal").addEventListener("click", (event) => {
    if (event.target === $("searchResultsModal")) closeSearchResults();
  });
  $("backToSearchButton").addEventListener("click", returnToSearch);
  $("newSessionFromReviewButton").addEventListener("click", startReviewFollowUpSession);
  $("deleteReviewClientButton").addEventListener("click", deleteReviewClient);
  $("addCustomBlockButton").addEventListener("click", addCustomBlock);
  $("customBlockDraft").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomBlock();
    }
  });
  $("confirmSessionButton").addEventListener("click", confirmSession);
  $("cancelSessionButton").addEventListener("click", cancelSessionConfirm);
  $("copySummaryButton").addEventListener("click", copySummary);
  $("spreadOneButton").addEventListener("click", () => setSpreadMode("one"));
  $("spreadThreeButton").addEventListener("click", () => setSpreadMode("three"));
  window.addEventListener("beforeunload", flushPendingSave);

  [...clientFieldIds, ...sessionFieldIds].forEach((id) => {
    $(id).addEventListener("input", queueSave);
  });
}

state.clients.forEach(normalizeClient);
restoreActiveState();
bindEvents();
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function restoreActiveState() {
  const storedClient = state.clients.find((client) => client.id === state.activeClientId);
  if (!storedClient) return;
  activeClientId = storedClient.id;
  const storedSession = storedClient.sessions.find((session) => session.id === state.activeSessionId);
  activeSessionId = storedSession?.id || latestSession(storedClient)?.id || storedClient.sessions[0]?.id || null;
}
