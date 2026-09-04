const storageKey = "investment-monitor-holdings";
const historyStorageKey = "investment-monitor-history";
const annualHistoryStorageKey = "investment-monitor-annual-history";
const btcTransactionsStorageKey = "investment-monitor-btc-transactions";
const goldTransactionsStorageKey = "investment-monitor-gold-transactions";
const incomeTransactionsStorageKey = "investment-monitor-income-transactions";
const sheetSyncUrl = "https://script.google.com/macros/s/AKfycbwIEmZ115c2wB5_lV24g3yJFYhEQMNSOpkG5glsrW6gUajEuht2rke-9pvRSyZQptKs8A/exec";
const sheetSyncToken = "inv-4tu6v942w8c-mpi67qz5";
const colors = ["#2563eb", "#0f9f6e", "#c27a07", "#7c3aed", "#0891b2", "#d92d20"];
const typeLabels = {
  stock: { en: "Stock", th: "หุ้น" },
  fund: { en: "Fund", th: "กองทุน" },
  bond: { en: "Bond", th: "ตราสารหนี้" },
  cash: { en: "Cash", th: "เงินสด" },
  crypto: { en: "Crypto", th: "คริปโต" },
  gold: { en: "Gold", th: "ทอง" },
};
const valueOnlyTypes = new Set(["cash"]);
const transactionBackedTypes = new Set(["crypto", "gold"]);
const incomeTypeLabels = {
  dividend: { en: "Dividend", th: "ปันผล" },
  interest: { en: "Interest", th: "ดอกเบี้ย" },
  other: { en: "Other", th: "อื่นๆ" },
};

const createId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const starterHoldings = [
  { id: createId(), name: "SET50 ETF", type: "fund", units: 1200, avgCost: 9.8, currentPrice: 10.35, annualDividend: 420 },
  { id: createId(), name: "AAPL", type: "stock", units: 18, avgCost: 5900, currentPrice: 6750, annualDividend: 920 },
  { id: createId(), name: "Thai Bond Fund", type: "bond", units: 3200, avgCost: 10, currentPrice: 10.12, annualDividend: 980 },
  { id: createId(), name: "Cash Reserve", type: "cash", units: 1, avgCost: 85000, currentPrice: 85000, annualDividend: 0 },
  { id: createId(), name: "BTC", type: "crypto", units: 0.08, avgCost: 2100000, currentPrice: 2360000, annualDividend: 0 },
];

let holdings = loadHoldings();
let investmentHistory = loadInvestmentHistory();
let annualInvestmentHistory = loadAnnualInvestmentHistory();
let btcTransactions = loadBtcTransactions();
let goldTransactions = loadGoldTransactions();
let incomeTransactions = loadIncomeTransactions();
let activeFilter = "all";
let editingHoldingId = null;

const formatCurrency = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 7,
  }).format(value);

const formatUnits = (value) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  }).format(value);

const formatPct = (value) => `${value.toFixed(2)}%`;
const parseTransactionNumber = (value) => {
  const normalized = String(value).replaceAll(",", "").trim();
  return normalized === "" ? 0 : Number(normalized) || 0;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const biLabel = (en, th) => `<span class="bi-label">${en}<small>${th}</small></span>`;
const getTypeLabel = (type) => {
  const label = typeLabels[type];
  return label ? biLabel(label.en, label.th) : escapeHtml(type);
};
const getTypeText = (type) => {
  const label = typeLabels[type];
  return label ? `${label.en} / ${label.th}` : type;
};

function loadHoldings() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return starterHoldings;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : starterHoldings;
  } catch {
    return starterHoldings;
  }
}

function saveHoldings() {
  localStorage.setItem(storageKey, JSON.stringify(holdings));
}

function loadInvestmentHistory() {
  const saved = localStorage.getItem(historyStorageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInvestmentHistory() {
  localStorage.setItem(historyStorageKey, JSON.stringify(investmentHistory));
}

function loadAnnualInvestmentHistory() {
  const saved = localStorage.getItem(annualHistoryStorageKey);
  if (!saved) {
    const year = new Date().getFullYear();
    return [
      { id: createId(), year: year - 1, startValue: 0, endValue: 0, note: "" },
      { id: createId(), year, startValue: 0, endValue: 0, note: "" },
    ];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAnnualInvestmentHistory() {
  localStorage.setItem(annualHistoryStorageKey, JSON.stringify(annualInvestmentHistory));
}

function loadBtcTransactions() {
  const saved = localStorage.getItem(btcTransactionsStorageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBtcTransactions() {
  localStorage.setItem(btcTransactionsStorageKey, JSON.stringify(btcTransactions));
}

function loadGoldTransactions() {
  const saved = localStorage.getItem(goldTransactionsStorageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGoldTransactions() {
  localStorage.setItem(goldTransactionsStorageKey, JSON.stringify(goldTransactions));
}

function loadIncomeTransactions() {
  const saved = localStorage.getItem(incomeTransactionsStorageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIncomeTransactions() {
  localStorage.setItem(incomeTransactionsStorageKey, JSON.stringify(incomeTransactions));
}

function getBackupPayload() {
  return {
    app: "investment-monitor-dashboard",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      holdings,
      investmentHistory,
      annualInvestmentHistory,
      btcTransactions,
      goldTransactions,
      incomeTransactions,
    },
  };
}

function downloadBackup() {
  const payload = JSON.stringify(getBackupPayload(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");

  link.href = url;
  link.download = `investment-dashboard-backup-${dateStamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getBackupData(parsed) {
  const source = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
  const backupData = {
    holdings: source?.holdings,
    investmentHistory: source?.investmentHistory,
    annualInvestmentHistory: source?.annualInvestmentHistory,
    btcTransactions: source?.btcTransactions,
    goldTransactions: source?.goldTransactions,
    incomeTransactions: source?.incomeTransactions || [],
  };

  if (Object.values(backupData).some((value) => !Array.isArray(value))) {
    throw new Error("Invalid backup file");
  }

  return backupData;
}

function restoreBackup(backupData) {
  holdings = backupData.holdings;
  investmentHistory = backupData.investmentHistory;
  annualInvestmentHistory = backupData.annualInvestmentHistory;
  btcTransactions = backupData.btcTransactions;
  goldTransactions = backupData.goldTransactions;
  incomeTransactions = backupData.incomeTransactions;

  saveHoldings();
  saveInvestmentHistory();
  saveAnnualInvestmentHistory();
  saveBtcTransactions();
  saveGoldTransactions();
  saveIncomeTransactions();
  renderAll();
}

function setSheetSyncStatus(message, state = "") {
  const status = document.querySelector("#sheetSyncStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.toggle("success", state === "success");
  status.classList.toggle("error", state === "error");
}

function setSheetButtonsBusy(isBusy) {
  document.querySelector("#saveSheetButton").disabled = isBusy;
  document.querySelector("#loadSheetButton").disabled = isBusy;
}

function loadSheetData() {
  return new Promise((resolve, reject) => {
    const callbackName = `sheetSyncCallback_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Sheet connection timed out"));
    }, 20000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    script.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not connect to Google Sheet"));
    });

    script.src = `${sheetSyncUrl}?token=${encodeURIComponent(sheetSyncToken)}&callback=${encodeURIComponent(callbackName)}&ts=${Date.now()}`;
    document.body.append(script);
  });
}

async function loadFromSheet({ silent = false } = {}) {
  try {
    setSheetButtonsBusy(true);
    if (!silent) setSheetSyncStatus("Loading from Sheet...");

    const response = await loadSheetData();
    if (!response?.ok) {
      throw new Error(response?.error || "Sheet load failed");
    }

    if (!response.payload) {
      setSheetSyncStatus("Sheet is empty", "success");
      return;
    }

    restoreBackup(getBackupData(response.payload));
    const updated = response.updatedAt ? new Date(response.updatedAt).toLocaleString("th-TH") : "latest";
    setSheetSyncStatus(`Loaded ${updated}`, "success");
  } catch (error) {
    if (!silent) {
      alert("Could not load data from Google Sheet. Please try again.");
    }
    setSheetSyncStatus("Sheet load failed", "error");
  } finally {
    setSheetButtonsBusy(false);
  }
}

async function saveToSheet() {
  try {
    setSheetButtonsBusy(true);
    setSheetSyncStatus("Saving to Sheet...");

    await fetch(sheetSyncUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token: sheetSyncToken,
        payload: getBackupPayload(),
      }),
    });

    setSheetSyncStatus(`Saved ${new Date().toLocaleTimeString("th-TH")}`, "success");
  } catch {
    alert("Could not save data to Google Sheet. Please try again.");
    setSheetSyncStatus("Sheet save failed", "error");
  } finally {
    setSheetButtonsBusy(false);
  }
}

function importBackupFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const backupData = getBackupData(JSON.parse(reader.result));
      const shouldRestore = confirm("Importing this backup will replace the current dashboard data. Continue?");
      if (!shouldRestore) return;

      restoreBackup(backupData);
      alert("Backup imported successfully.");
    } catch {
      alert("This file could not be imported. Please choose a valid dashboard backup JSON file.");
    } finally {
      document.querySelector("#backupFileInput").value = "";
    }
  });
  reader.addEventListener("error", () => {
    alert("This file could not be read. Please try again.");
    document.querySelector("#backupFileInput").value = "";
  });
  reader.readAsText(file);
}

function addHistoryEntry(action, item) {
  investmentHistory.unshift({
    id: createId(),
    action,
    assetName: item.name,
    type: item.type,
    units: item.units,
    price: item.currentPrice,
    value: getHoldingValue(item),
    createdAt: new Date().toISOString(),
  });
  investmentHistory = investmentHistory.slice(0, 100);
  saveInvestmentHistory();
}

function getIncomeTotals(rows = incomeTransactions) {
  return rows.reduce(
    (acc, item) => {
      acc.gross += Number(item.grossAmount) || 0;
      acc.tax += Number(item.tax) || 0;
      acc.net += Number(item.amount) || 0;
      return acc;
    },
    { gross: 0, tax: 0, net: 0 }
  );
}

function getIncomeForHolding(item) {
  return getIncomeTotals(
    incomeTransactions.filter((row) => row.holdingId === item.id || (!row.holdingId && row.assetName === item.name))
  );
}

function getIncomeTypeLabel(type) {
  const label = incomeTypeLabels[type];
  return label ? biLabel(label.en, label.th) : escapeHtml(type);
}

function getHoldingOptions(selectedId = "", fallbackName = "") {
  const hasSelectedHolding = selectedId && holdings.some((item) => item.id === selectedId);
  return [
    `<option value="">Unlinked / ไม่ผูกสินทรัพย์</option>`,
    selectedId && !hasSelectedHolding
      ? `<option value="${escapeHtml(selectedId)}" selected>${escapeHtml(fallbackName || "Deleted asset")} (deleted)</option>`
      : "",
    ...holdings.map((item) => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)} (${getTypeText(item.type)})</option>`),
  ].join("");
}

function getIncomeAssetName(holdingId, fallbackName = "") {
  const holding = holdings.find((item) => item.id === holdingId);
  return holding ? holding.name : fallbackName;
}

function getTotals() {
  return holdings.reduce(
    (acc, item) => {
      const cost = getHoldingCost(item);
      const value = getHoldingValue(item);
      acc.value += value;
      acc.allCost += item.type === "cash" ? value : cost;
      if (item.type !== "cash") {
        acc.cost += cost;
        acc.investmentValue += value;
      }
      acc.dividend += item.annualDividend;
      return acc;
    },
    { cost: 0, allCost: 0, value: 0, investmentValue: 0, dividend: 0 }
  );
}

function getHoldingCost(item) {
  if (item.type === "cash") return 0;
  if (transactionBackedTypes.has(item.type)) {
    const summary = getTransactionBackedSummary(item);
    if (summary.hasTransactions) return summary.cost;
  }

  const costUnits = item.type === "gold" ? item.units / 15.244 : item.units;
  return costUnits * item.avgCost;
}

function getHoldingValue(item) {
  if (item.type === "cash") return item.currentPrice;
  if (transactionBackedTypes.has(item.type)) {
    const summary = getTransactionBackedSummary(item);
    if (summary.hasTransactions) {
      return item.type === "gold" ? getGoldCostUnits(summary.units) * item.currentPrice : summary.units * item.currentPrice;
    }
  }

  const valueUnits = item.type === "gold" ? item.units / 15.244 : item.units;
  return valueUnits * item.currentPrice;
}

function getHoldingUnits(item) {
  if (transactionBackedTypes.has(item.type)) {
    const summary = getTransactionBackedSummary(item);
    if (summary.hasTransactions) return summary.units;
  }

  return item.units;
}

function getHoldingAvgCost(item) {
  if (transactionBackedTypes.has(item.type)) {
    const summary = getTransactionBackedSummary(item);
    if (summary.hasTransactions) {
      return item.type === "gold"
        ? summary.costUnits ? summary.cost / summary.costUnits : 0
        : summary.units ? summary.cost / summary.units : 0;
    }
  }

  return item.avgCost;
}

function getDividendYieldRanking() {
  return holdings
    .filter((item) => item.annualDividend > 0 && getHoldingValue(item) > 0)
    .map((item) => {
      const value = getHoldingValue(item);
      return {
        ...item,
        value,
        dividendYield: (item.annualDividend / value) * 100,
      };
    })
    .sort((a, b) => b.dividendYield - a.dividendYield);
}

function renderSummary() {
  const totals = getTotals();
  const incomeTotals = getIncomeTotals();
  const capitalGain = totals.investmentValue - totals.cost;
  const gain = capitalGain + incomeTotals.net;
  const returnBase = totals.cost || totals.allCost;
  const gainPct = returnBase ? (gain / returnBase) * 100 : 0;
  const dividendYield = totals.value ? (totals.dividend / totals.value) * 100 : 0;
  const dividendYieldRanking = getDividendYieldRanking();
  const topDividendYield = dividendYieldRanking[0];

  document.querySelector("#totalValue").textContent = formatCurrency(totals.value);
  document.querySelector("#totalCost").innerHTML = `Investment cost <span class="th-inline">ต้นทุน</span> ${formatCurrency(totals.cost)}`;
  document.querySelector("#totalReturn").textContent = formatCurrency(gain);
  document.querySelector("#totalReturn").className = gain >= 0 ? "positive" : "negative";
  document.querySelector("#totalReturnPct").innerHTML = `Capital ${formatCurrency(capitalGain)} + income ${formatCurrency(incomeTotals.net)} <span class="th-inline">รวม</span> ${formatPct(gainPct)}`;
  document.querySelector("#receivedIncome").textContent = formatCurrency(incomeTotals.net);
  document.querySelector("#receivedIncomeHint").innerHTML = `Gross ${formatCurrency(incomeTotals.gross)} | tax ${formatCurrency(incomeTotals.tax)} <span class="th-inline">รับสุทธิหลังภาษี</span>`;
  document.querySelector("#annualDividend").textContent = formatCurrency(totals.dividend);
  document.querySelector("#dividendYield").innerHTML = `Yield <span class="th-inline">ผลตอบแทน</span> ${formatPct(dividendYield)}`;
  document.querySelector("#yieldPerformance").textContent = topDividendYield ? formatPct(topDividendYield.dividendYield) : "0.00%";
  document.querySelector("#yieldPerformanceHint").innerHTML = topDividendYield
    ? `${escapeHtml(topDividendYield.name)} | highest from ${dividendYieldRanking.length} dividend assets <span class="th-inline">สูงสุดจากสินทรัพย์ที่มีปันผล</span>`
    : `No dividend-paying assets yet <span class="th-inline">ยังไม่มีสินทรัพย์ที่มีปันผล</span>`;
}

function renderAllocation() {
  const totals = getTotals();
  const byType = holdings.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + getHoldingValue(item);
    return acc;
  }, {});

  let cursor = 0;
  const gradientParts = Object.entries(byType).map(([type, value], index) => {
    const start = cursor;
    const size = totals.value ? (value / totals.value) * 100 : 0;
    cursor += size;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  document.querySelector("#allocationDonut").style.background = `conic-gradient(${gradientParts.join(", ") || "#d9e0ea 0 100%"})`;
  document.querySelector("#allocationLegend").innerHTML = Object.entries(byType)
    .map(([type, value], index) => {
      const pct = totals.value ? (value / totals.value) * 100 : 0;
      return `
        <div class="legend-row">
          <span class="legend-label">
            <span class="swatch" style="background:${colors[index % colors.length]}"></span>
            ${getTypeLabel(type)}
          </span>
          <strong>${formatPct(pct)}</strong>
        </div>
      `;
    })
    .join("");

  document.querySelector("#lastUpdated").innerHTML = `Updated <span class="th-inline">อัปเดต</span> ${new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function getHoldingPerformance(item) {
  const cost = getHoldingCost(item);
  const value = getHoldingValue(item);
  const income = getIncomeForHolding(item).net;
  if (item.type === "cash") {
    const gainPct = value ? (income / value) * 100 : 0;
    return { cost, value, income, capitalGain: 0, gain: income, gainPct };
  }

  const capitalGain = value - cost;
  const gain = capitalGain + income;
  const gainPct = cost ? (gain / cost) * 100 : 0;
  return { cost, value, income, capitalGain, gain, gainPct };
}

function renderBestPerformer() {
  const best = holdings
    .map((item) => ({ ...item, performance: getHoldingPerformance(item) }))
    .sort((a, b) => b.performance.gainPct - a.performance.gainPct)[0];

  if (!best) {
    document.querySelector("#bestPerformer").innerHTML = `<p class="empty-state">No assets yet <span class="th-inline">ยังไม่มีรายการสินทรัพย์</span></p>`;
    return;
  }

  const gainClass = best.performance.gain >= 0 ? "positive" : "negative";
  document.querySelector("#bestPerformer").innerHTML = `
    <div>
      <span class="performer-label">${getTypeLabel(best.type)}</span>
      <strong>${escapeHtml(best.name)}</strong>
    </div>
    <div class="performer-return ${gainClass}">
      ${formatPct(best.performance.gainPct)}
    </div>
    <div class="performer-detail">
      ${biLabel("Gain / Loss", "กำไร/ขาดทุน")}
      <strong class="${gainClass}">${formatCurrency(best.performance.gain)}</strong>
    </div>
    <div class="performer-detail">
      ${biLabel("Current Value", "มูลค่าปัจจุบัน")}
      <strong>${formatCurrency(best.performance.value)}</strong>
    </div>
  `;
}

function renderTable() {
  const table = document.querySelector("#holdingsTable");
  const filtered = activeFilter === "all" ? holdings : holdings.filter((item) => item.type === activeFilter);

  table.innerHTML = filtered
    .map((item) => {
      const performance = getHoldingPerformance(item);
      const hidesUnitsAndCost = valueOnlyTypes.has(item.type);
      const isCash = item.type === "cash";
      const unitsText = hidesUnitsAndCost ? "-" : formatNumber(getHoldingUnits(item));
      const avgCostText = hidesUnitsAndCost ? "-" : formatCurrency(getHoldingAvgCost(item));
      const costText = hidesUnitsAndCost ? "-" : formatCurrency(performance.cost);
      const currentPriceText = hidesUnitsAndCost ? "-" : formatCurrency(item.currentPrice);
      const incomeText = performance.income ? formatCurrency(performance.income) : "-";
      const returnText = isCash
        ? `${formatCurrency(performance.gain)} (${formatPct(performance.gainPct)})`
        : `${formatCurrency(performance.gain)} (${formatPct(performance.gainPct)})`;
      return `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td><span class="pill">${getTypeLabel(item.type)}</span></td>
          <td>${unitsText}</td>
          <td>${avgCostText}</td>
          <td>${costText}</td>
          <td>${currentPriceText}</td>
          <td>${formatCurrency(performance.value)}</td>
          <td>${incomeText}</td>
          <td class="${performance.gain >= 0 ? "positive" : "negative"}">${returnText}</td>
          <td>
            <div class="row-actions">
              <button class="edit-button" type="button" data-action="edit" data-id="${item.id}" title="Edit">Edit<small>แก้ไข</small></button>
              <button class="delete-button" type="button" data-action="delete" data-id="${item.id}" title="Delete">×</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAnnualHistory() {
  const table = document.querySelector("#annualHistoryTable");
  if (!annualInvestmentHistory.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">No annual data yet <span class="th-inline">ยังไม่มีข้อมูลประจำปี</span></td>
      </tr>
    `;
    return;
  }

  const rows = [...annualInvestmentHistory].sort((a, b) => b.year - a.year);
  const byYear = annualInvestmentHistory.reduce((acc, row) => {
    acc[row.year] = row;
    return acc;
  }, {});

  table.innerHTML = rows
    .map((row) => {
      const startValue = Number(row.startValue) || 0;
      const endValue = Number(row.endValue) || 0;
      const yearlyGrowth = startValue ? ((endValue - startValue) / startValue) * 100 : 0;
      const previous = byYear[row.year - 1];
      const previousEndValue = previous ? Number(previous.endValue) || 0 : 0;
      const previousGrowth = previousEndValue ? ((endValue - previousEndValue) / previousEndValue) * 100 : null;
      const yearlyClass = yearlyGrowth >= 0 ? "positive" : "negative";
      const previousClass = previousGrowth === null || previousGrowth >= 0 ? "positive" : "negative";

      return `
        <tr>
          <td><strong>${row.year + 543}</strong></td>
          <td><input class="table-input" data-annual-id="${row.id}" data-field="startValue" type="number" min="0" step="0.01" value="${startValue}" /></td>
          <td><input class="table-input" data-annual-id="${row.id}" data-field="endValue" type="number" min="0" step="0.01" value="${endValue}" /></td>
          <td class="${yearlyClass}">${formatPct(yearlyGrowth)}</td>
          <td class="${previousClass}">${previousGrowth === null ? "-" : formatPct(previousGrowth)}</td>
          <td><input class="table-input note-input" data-annual-id="${row.id}" data-field="note" type="text" value="${escapeHtml(row.note || "")}" /></td>
          <td><button class="delete-button" type="button" data-delete-annual-id="${row.id}" title="Delete">×</button></td>
        </tr>
      `;
    })
    .join("");

  renderAnnualInvestmentChart();
}

function renderAnnualInvestmentChart() {
  const chart = document.querySelector("#annualInvestmentChart");
  const rows = [...annualInvestmentHistory].sort((a, b) => a.year - b.year);
  const data = rows.map((row) => {
    const startValue = Number(row.startValue) || 0;
    const endValue = Number(row.endValue) || 0;
    return {
      year: row.year,
      growth: startValue ? ((endValue - startValue) / startValue) * 100 : 0,
    };
  });

  if (!rows.length) {
    chart.innerHTML = `<p class="empty-state">No chart data yet <span class="th-inline">ยังไม่มีข้อมูลสำหรับแสดงกราฟ</span></p>`;
    return;
  }

  const width = Math.max(560, data.length * 140);
  const height = 300;
  const padding = { top: 34, right: 34, bottom: 52, left: 58 };
  const minGrowth = Math.min(...data.map((item) => item.growth), 0);
  const maxGrowth = Math.max(...data.map((item) => item.growth), 0);
  const range = maxGrowth - minGrowth || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xFor = (index) => padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const yFor = (value) => padding.top + ((maxGrowth - value) / range) * plotHeight;
  const zeroY = yFor(0);
  const points = data.map((item, index) => `${xFor(index)},${yFor(item.growth)}`).join(" ");

  chart.innerHTML = `
    <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Annual net growth line chart">
      <line class="chart-axis" x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}" />
      <polyline class="chart-line" points="${points}" />
      ${data
        .map((item, index) => {
          const x = xFor(index);
          const y = yFor(item.growth);
          return `
            <g class="chart-point">
              <circle cx="${x}" cy="${y}" r="5" />
              <text class="chart-value" x="${x}" y="${y - 12}" text-anchor="middle">${formatPct(item.growth)}</text>
              <text class="chart-year-label" x="${x}" y="${height - 18}" text-anchor="middle">${item.year + 543}</text>
            </g>
          `;
        })
        .join("")}
    </svg>
  `;
}

function renderPortfolioGrowth() {
  const totals = getTotals();
  const incomeTotals = getIncomeTotals();
  const gain = totals.value - totals.allCost + incomeTotals.net;
  const gainPct = totals.allCost ? (gain / totals.allCost) * 100 : 0;
  const growthClass = gain >= 0 ? "positive" : "negative";
  const progress = totals.allCost ? Math.min(((totals.value + incomeTotals.net) / totals.allCost) * 100, 160) : 0;

  document.querySelector("#portfolioGrowth").innerHTML = `
    <div class="growth-row">
      ${biLabel("Current Value", "มูลค่าปัจจุบัน")}
      <strong>${formatCurrency(totals.value)}</strong>
    </div>
    <div class="growth-row">
      ${biLabel("Total Assets", "สินทรัพย์ทั้งหมด")}
      <strong>${formatCurrency(totals.allCost)}</strong>
    </div>
    <div class="growth-row">
      ${biLabel("Income Received", "รายรับที่ได้รับ")}
      <strong>${formatCurrency(incomeTotals.net)}</strong>
    </div>
    <div class="growth-row">
      ${biLabel("Net Growth", "เติบโตสุทธิ")}
      <strong class="${growthClass}">${formatCurrency(gain)} (${formatPct(gainPct)})</strong>
    </div>
    <div class="progress growth-progress"><span class="${growthClass}" style="width:${progress}%"></span></div>
  `;
}

function renderDashboard() {
  renderSummary();
  renderAllocation();
  renderBestPerformer();
  renderTable();
  renderPortfolioGrowth();
}

function getTransactionBackedSummary(item) {
  if (item.type === "crypto") return { ...getBtcSummary(), costUnits: 0, hasTransactions: btcTransactions.length > 0 };
  if (item.type === "gold") return { ...getGoldSummary(), hasTransactions: goldTransactions.length > 0 };
  return { units: 0, costUnits: 0, cost: 0, hasTransactions: false };
}

function getBtcSummary() {
  return [...btcTransactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce(
      (acc, item) => {
        const units = Number(item.units) || 0;
        const price = Number(item.price) || 0;
        const currentAvgCost = acc.units ? acc.cost / acc.units : 0;

        if (item.side === "buy") {
          acc.units += units;
          acc.cost += units * price;
        } else {
          const sellUnits = Math.min(units, acc.units);
          acc.units -= sellUnits;
          acc.cost -= sellUnits * currentAvgCost;
        }

        if (acc.units <= 0.00000005) {
          acc.units = 0;
          acc.cost = 0;
        }

        return acc;
      },
      { units: 0, cost: 0 }
    );
}

function renderBtcTransactions() {
  const table = document.querySelector("#btcTransactionsTable");
  renderBtcTransactionSummary();

  if (!btcTransactions.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">No BTC transactions yet <span class="th-inline">ยังไม่มีประวัติการซื้อขาย BTC</span></td>
      </tr>
    `;
    return;
  }

  table.innerHTML = [...btcTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => {
      const value = (Number(item.units) || 0) * (Number(item.price) || 0);
      const sideLabel = item.side === "buy" ? biLabel("Buy", "ซื้อ") : biLabel("Sell", "ขาย");
      const sideClass = item.side === "buy" ? "positive" : "negative";

      return `
        <tr>
          <td><input class="table-input date-input" data-btc-id="${item.id}" data-field="date" type="date" value="${item.date}" /></td>
          <td>
            <select class="table-input" data-btc-id="${item.id}" data-field="side">
              <option value="buy" ${item.side === "buy" ? "selected" : ""}>Buy / ซื้อ</option>
              <option value="sell" ${item.side === "sell" ? "selected" : ""}>Sell / ขาย</option>
            </select>
          </td>
          <td><input class="table-input" data-btc-id="${item.id}" data-field="units" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${Number(item.units) || 0}" /></td>
          <td><input class="table-input" data-btc-id="${item.id}" data-field="price" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${Number(item.price) || 0}" /></td>
          <td class="${sideClass}" data-btc-value-id="${item.id}">${sideLabel} ${formatCurrency(value)}</td>
          <td><button class="delete-button" type="button" data-delete-btc-id="${item.id}" title="Delete">×</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderBtcTransactionSummary() {
  const summary = getBtcSummary();
  const avgCost = summary.units ? summary.cost / summary.units : 0;

  document.querySelector("#btcAvgCost").textContent = formatCurrency(avgCost);
  document.querySelector("#btcBalance").textContent = formatUnits(summary.units);
  document.querySelector("#btcTotalCost").innerHTML = `Total cost <span class="th-inline">ต้นทุนรวม</span> ${formatCurrency(summary.cost)}`;
}

function renderBtcTransactionValue(row) {
  const valueCell = document.querySelector(`[data-btc-value-id="${row.id}"]`);
  if (!valueCell) return;

  const value = (Number(row.units) || 0) * (Number(row.price) || 0);
  const sideLabel = row.side === "buy" ? biLabel("Buy", "ซื้อ") : biLabel("Sell", "ขาย");
  const sideClass = row.side === "buy" ? "positive" : "negative";

  valueCell.classList.toggle("positive", sideClass === "positive");
  valueCell.classList.toggle("negative", sideClass === "negative");
  valueCell.innerHTML = `${sideLabel} ${formatCurrency(value)}`;
}

function getGoldCostUnits(units) {
  return (Number(units) || 0) / 15.244;
}

function getGoldSummary() {
  return [...goldTransactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce(
      (acc, item) => {
        const units = Number(item.units) || 0;
        const costUnits = getGoldCostUnits(units);
        const price = Number(item.price) || 0;
        const currentAvgCost = acc.costUnits ? acc.cost / acc.costUnits : 0;

        if (item.side === "buy") {
          acc.units += units;
          acc.costUnits += costUnits;
          acc.cost += costUnits * price;
        } else {
          const sellUnits = Math.min(units, acc.units);
          const sellCostUnits = getGoldCostUnits(sellUnits);
          acc.units -= sellUnits;
          acc.costUnits -= sellCostUnits;
          acc.cost -= sellCostUnits * currentAvgCost;
        }

        if (acc.units <= 0.00000005 || acc.costUnits <= 0.00000005) {
          acc.units = 0;
          acc.costUnits = 0;
          acc.cost = 0;
        }

        return acc;
      },
      { units: 0, costUnits: 0, cost: 0 }
    );
}

function renderGoldTransactions() {
  const table = document.querySelector("#goldTransactionsTable");
  renderGoldTransactionSummary();

  if (!goldTransactions.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">No gold transactions yet <span class="th-inline">ยังไม่มีประวัติการซื้อขายทอง</span></td>
      </tr>
    `;
    return;
  }

  table.innerHTML = [...goldTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => {
      const value = getGoldCostUnits(item.units) * (Number(item.price) || 0);
      const sideLabel = item.side === "buy" ? biLabel("Buy", "ซื้อ") : biLabel("Sell", "ขาย");
      const sideClass = item.side === "buy" ? "positive" : "negative";

      return `
        <tr>
          <td><input class="table-input date-input" data-gold-id="${item.id}" data-field="date" type="date" value="${item.date}" /></td>
          <td>
            <select class="table-input" data-gold-id="${item.id}" data-field="side">
              <option value="buy" ${item.side === "buy" ? "selected" : ""}>Buy / ซื้อ</option>
              <option value="sell" ${item.side === "sell" ? "selected" : ""}>Sell / ขาย</option>
            </select>
          </td>
          <td><input class="table-input" data-gold-id="${item.id}" data-field="units" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${Number(item.units) || 0}" /></td>
          <td><input class="table-input" data-gold-id="${item.id}" data-field="price" type="text" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${Number(item.price) || 0}" /></td>
          <td class="${sideClass}" data-gold-value-id="${item.id}">${sideLabel} ${formatCurrency(value)}</td>
          <td><button class="delete-button" type="button" data-delete-gold-id="${item.id}" title="Delete">×</button></td>
        </tr>
      `;
    })
    .join("");
}

function renderGoldTransactionSummary() {
  const summary = getGoldSummary();
  const avgCost = summary.costUnits ? summary.cost / summary.costUnits : 0;

  document.querySelector("#goldAvgCost").textContent = formatCurrency(avgCost);
  document.querySelector("#goldBalance").textContent = formatUnits(summary.units);
  document.querySelector("#goldTotalCost").innerHTML = `Total cost <span class="th-inline">ต้นทุนรวม</span> ${formatCurrency(summary.cost)}`;
}

function renderGoldTransactionValue(row) {
  const valueCell = document.querySelector(`[data-gold-value-id="${row.id}"]`);
  if (!valueCell) return;

  const value = getGoldCostUnits(row.units) * (Number(row.price) || 0);
  const sideLabel = row.side === "buy" ? biLabel("Buy", "ซื้อ") : biLabel("Sell", "ขาย");
  const sideClass = row.side === "buy" ? "positive" : "negative";

  valueCell.classList.toggle("positive", sideClass === "positive");
  valueCell.classList.toggle("negative", sideClass === "negative");
  valueCell.innerHTML = `${sideLabel} ${formatCurrency(value)}`;
}

function renderIncomeSummary() {
  const totals = getIncomeTotals();

  document.querySelector("#incomeNetTotal").textContent = formatCurrency(totals.net);
  document.querySelector("#incomeTaxTotal").textContent = formatCurrency(totals.tax);
  document.querySelector("#incomeGrossTotal").innerHTML = `Gross <span class="th-inline">ก่อนภาษี</span> ${formatCurrency(totals.gross)}`;
}

function renderIncomeTransactions() {
  const table = document.querySelector("#incomeTransactionsTable");
  renderIncomeSummary();

  if (!incomeTransactions.length) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table">No dividend or interest income yet <span class="th-inline">ยังไม่มีรายการปันผลหรือดอกเบี้ย</span></td>
      </tr>
    `;
    return;
  }

  table.innerHTML = [...incomeTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => {
      const grossAmount = Number(item.grossAmount) || Number(item.amount) || 0;
      const tax = Number(item.tax) || 0;
      const amount = Number(item.amount) || 0;
      return `
        <tr>
          <td><input class="table-input date-input" data-income-id="${item.id}" data-field="date" type="date" value="${item.date}" /></td>
          <td>
            <select class="table-input asset-select" data-income-id="${item.id}" data-field="holdingId">
              ${getHoldingOptions(item.holdingId, item.assetName)}
            </select>
          </td>
          <td>
            <select class="table-input" data-income-id="${item.id}" data-field="type">
              <option value="dividend" ${item.type === "dividend" ? "selected" : ""}>Dividend / ปันผล</option>
              <option value="interest" ${item.type === "interest" ? "selected" : ""}>Interest / ดอกเบี้ย</option>
              <option value="other" ${item.type === "other" ? "selected" : ""}>Other / อื่นๆ</option>
            </select>
          </td>
          <td><input class="table-input" data-income-id="${item.id}" data-field="grossAmount" type="text" inputmode="decimal" value="${grossAmount}" /></td>
          <td><input class="table-input" data-income-id="${item.id}" data-field="tax" type="text" inputmode="decimal" value="${tax}" /></td>
          <td class="positive" data-income-net-id="${item.id}">${formatCurrency(amount)}</td>
          <td><input class="table-input note-input" data-income-id="${item.id}" data-field="note" type="text" value="${escapeHtml(item.note || "")}" /></td>
          <td><button class="delete-button" type="button" data-delete-income-id="${item.id}" title="Delete">×</button></td>
        </tr>
      `;
    })
    .join("");
}

function updateIncomeTransactionField(row, field, value) {
  const holding = field === "holdingId" ? holdings.find((item) => item.id === value) : null;
  const nextRow = {
    ...row,
    [field]: field === "grossAmount" || field === "tax" ? parseTransactionNumber(value) : value,
  };

  if (field === "holdingId") {
    nextRow.assetName = holding ? holding.name : "";
  }

  nextRow.grossAmount = Number(nextRow.grossAmount) || 0;
  nextRow.tax = Number(nextRow.tax) || 0;
  nextRow.amount = Math.max(nextRow.grossAmount - nextRow.tax, 0);
  return nextRow;
}

function renderAll() {
  renderDashboard();
  renderAnnualHistory();
  renderBtcTransactions();
  renderGoldTransactions();
  renderIncomeTransactions();
}

function setHoldingDialogMode(mode) {
  const isEditing = mode === "edit";
  document.querySelector("#holdingDialogMode").textContent = isEditing ? "Edit Asset" : "New Asset";
  document.querySelector("#holdingDialogTitle").innerHTML = isEditing ? `Edit Asset <small>แก้ไขสินทรัพย์</small>` : `Add Asset <small>เพิ่มสินทรัพย์</small>`;
  document.querySelector("#holdingSubmitButton").innerHTML = isEditing ? `Save Changes <small>บันทึกการแก้ไข</small>` : `Save <small>บันทึก</small>`;
}

function setFieldVisibility(fieldId, inputId, isVisible, isRequired = false) {
  document.querySelector(fieldId).classList.toggle("is-hidden", !isVisible);
  document.querySelector(inputId).required = isVisible && isRequired;
}

function syncHoldingFieldsForType(type) {
  const usesValueOnly = valueOnlyTypes.has(type);
  const usesTransactionBackedEdit = editingHoldingId && transactionBackedTypes.has(type);
  const isCash = type === "cash";

  setFieldVisibility("#assetUnitsField", "#assetUnits", !usesValueOnly && !usesTransactionBackedEdit, true);
  setFieldVisibility("#assetCostField", "#assetCost", !usesValueOnly && !usesTransactionBackedEdit, true);
  setFieldVisibility("#assetDividendField", "#assetDividend", !isCash);
  document.querySelector("#assetPriceLabel").innerHTML = usesValueOnly ? `Value <small>มูลค่า</small>` : `Current Price <small>ราคาปัจจุบัน</small>`;

  if (usesValueOnly) {
    document.querySelector("#assetUnits").value = 1;
    document.querySelector("#assetCost").value = "";
  }

  if (isCash) {
    document.querySelector("#assetDividend").value = 0;
  }
}

function openAddHoldingDialog() {
  editingHoldingId = null;
  document.querySelector("#holdingForm").reset();
  document.querySelector("#assetDividend").value = 0;
  setHoldingDialogMode("add");
  syncHoldingFieldsForType(document.querySelector("#assetType").value);
  document.querySelector("#holdingDialog").showModal();
}

function openEditHoldingDialog(item) {
  editingHoldingId = item.id;
  setHoldingDialogMode("edit");
  document.querySelector("#assetName").value = item.name;
  document.querySelector("#assetType").value = item.type;
  document.querySelector("#assetUnits").value = item.units;
  document.querySelector("#assetCost").value = item.avgCost;
  document.querySelector("#assetPrice").value = valueOnlyTypes.has(item.type) ? getHoldingValue(item) : item.currentPrice;
  document.querySelector("#assetDividend").value = item.annualDividend || 0;
  syncHoldingFieldsForType(item.type);
  document.querySelector("#holdingDialog").showModal();
}

function addInitialTransactionForHolding(item) {
  if (!transactionBackedTypes.has(item.type) || item.units <= 0 || item.avgCost <= 0) return;

  const transaction = {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    side: "buy",
    units: item.units,
    price: item.avgCost,
  };

  if (item.type === "crypto") {
    btcTransactions.unshift(transaction);
    saveBtcTransactions();
    return;
  }

  if (item.type === "gold") {
    goldTransactions.unshift(transaction);
    saveGoldTransactions();
  }
}

document.querySelector("#addHoldingButton").addEventListener("click", () => {
  openAddHoldingDialog();
});

document.querySelector("#closeHoldingDialogButton").addEventListener("click", () => {
  document.querySelector("#holdingDialog").close();
});

document.querySelector("#assetType").addEventListener("change", (event) => {
  syncHoldingFieldsForType(event.target.value);
});

document.querySelector("#exportBackupButton").addEventListener("click", () => {
  downloadBackup();
});

document.querySelector("#importBackupButton").addEventListener("click", () => {
  document.querySelector("#backupFileInput").click();
});

document.querySelector("#saveSheetButton").addEventListener("click", () => {
  saveToSheet();
});

document.querySelector("#loadSheetButton").addEventListener("click", () => {
  const shouldLoad = confirm("Loading from Google Sheet will replace the current dashboard data on this browser. Continue?");
  if (shouldLoad) loadFromSheet();
});

document.querySelector("#backupFileInput").addEventListener("change", (event) => {
  importBackupFile(event.target.files[0]);
});

document.querySelector("#holdingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const type = form.get("type");
  const currentPrice = Number(form.get("currentPrice"));
  const usesValueOnly = valueOnlyTypes.has(type);
  const nextHolding = {
    id: editingHoldingId || createId(),
    name: form.get("name").trim(),
    type,
    units: usesValueOnly ? 1 : Number(form.get("units")),
    avgCost: usesValueOnly ? 0 : Number(form.get("avgCost")),
    currentPrice,
    annualDividend: type === "cash" ? 0 : Number(form.get("annualDividend")) || 0,
  };

  if (editingHoldingId) {
    holdings = holdings.map((item) => (item.id === editingHoldingId ? nextHolding : item));
    addHistoryEntry("Edit", nextHolding);
  } else {
    holdings.push(nextHolding);
    addInitialTransactionForHolding(nextHolding);
    addHistoryEntry("Add", nextHolding);
  }

  editingHoldingId = null;
  saveHoldings();
  event.currentTarget.reset();
  document.querySelector("#holdingDialog").close();
  renderAll();
});

document.querySelector("#holdingsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;

  const item = holdings.find((holding) => holding.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openEditHoldingDialog(item);
    return;
  }

  if (button.dataset.action === "delete") {
    addHistoryEntry("Delete", item);
    holdings = holdings.filter((holding) => holding.id !== button.dataset.id);
    saveHoldings();
    renderAll();
  }
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector("#dashboardTab").classList.toggle("active", selectedTab === "dashboard");
    document.querySelector("#historyTab").classList.toggle("active", selectedTab === "history");
    document.querySelector("#incomeTab").classList.toggle("active", selectedTab === "income");
    document.querySelector("#btcTab").classList.toggle("active", selectedTab === "btc");
    document.querySelector("#goldTab").classList.toggle("active", selectedTab === "gold");
  });
});

document.querySelector("#addAnnualYearButton").addEventListener("click", () => {
  const years = annualInvestmentHistory.map((row) => row.year);
  const nextYear = years.length ? Math.max(...years) + 1 : new Date().getFullYear();
  annualInvestmentHistory.push({ id: createId(), year: nextYear, startValue: 0, endValue: 0, note: "" });
  saveAnnualInvestmentHistory();
  renderAnnualHistory();
});

document.querySelector("#annualHistoryTable").addEventListener("input", (event) => {
  const input = event.target.closest("[data-annual-id]");
  if (!input) return;

  annualInvestmentHistory = annualInvestmentHistory.map((row) =>
    row.id === input.dataset.annualId
      ? {
          ...row,
          [input.dataset.field]: input.dataset.field === "note" ? input.value : Number(input.value) || 0,
        }
      : row
  );
  saveAnnualInvestmentHistory();
  renderAnnualInvestmentChart();
});

document.querySelector("#annualHistoryTable").addEventListener("change", () => {
  renderAnnualHistory();
});

document.querySelector("#annualHistoryTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-annual-id]");
  if (!button) return;

  annualInvestmentHistory = annualInvestmentHistory.filter((row) => row.id !== button.dataset.deleteAnnualId);
  saveAnnualInvestmentHistory();
  renderAnnualHistory();
});

document.querySelector("#addIncomeButton").addEventListener("click", () => {
  const defaultHolding = holdings.find((item) => item.type !== "crypto" && item.type !== "gold") || holdings[0];
  const isCash = defaultHolding?.type === "cash";
  incomeTransactions.unshift({
    id: createId(),
    holdingId: defaultHolding?.id || "",
    assetName: defaultHolding?.name || "",
    type: isCash ? "interest" : "dividend",
    date: new Date().toISOString().slice(0, 10),
    grossAmount: 0,
    tax: 0,
    amount: 0,
    note: "",
  });
  saveIncomeTransactions();
  renderIncomeTransactions();
  renderDashboard();
});

document.querySelector("#incomeTransactionsTable").addEventListener("input", (event) => {
  const input = event.target.closest("[data-income-id]");
  if (!input) return;

  let updatedRow = null;
  incomeTransactions = incomeTransactions.map((row) =>
    row.id === input.dataset.incomeId ? (updatedRow = updateIncomeTransactionField(row, input.dataset.field, input.value)) : row
  );
  saveIncomeTransactions();

  if (updatedRow) {
    const netCell = document.querySelector(`[data-income-net-id="${updatedRow.id}"]`);
    if (netCell) netCell.textContent = formatCurrency(updatedRow.amount);
    renderIncomeSummary();
    renderDashboard();
  }
});

document.querySelector("#incomeTransactionsTable").addEventListener("change", (event) => {
  const input = event.target.closest("[data-income-id]");
  if (!input) return;

  incomeTransactions = incomeTransactions.map((row) =>
    row.id === input.dataset.incomeId ? updateIncomeTransactionField(row, input.dataset.field, input.value) : row
  );
  saveIncomeTransactions();
  renderIncomeTransactions();
  renderDashboard();
});

document.querySelector("#incomeTransactionsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-income-id]");
  if (!button) return;

  incomeTransactions = incomeTransactions.filter((row) => row.id !== button.dataset.deleteIncomeId);
  saveIncomeTransactions();
  renderIncomeTransactions();
  renderDashboard();
});

document.querySelector("#addBtcTransactionButton").addEventListener("click", () => {
  btcTransactions.unshift({
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    side: "buy",
    units: 0,
    price: 0,
  });
  saveBtcTransactions();
  renderBtcTransactions();
  renderDashboard();
});

document.querySelector("#btcTransactionsTable").addEventListener("input", (event) => {
  const input = event.target.closest("[data-btc-id]");
  if (!input) return;

  let updatedRow = null;
  btcTransactions = btcTransactions.map((row) =>
    row.id === input.dataset.btcId
      ? (updatedRow = {
          ...row,
          [input.dataset.field]: input.dataset.field === "date" || input.dataset.field === "side" ? input.value : parseTransactionNumber(input.value),
        })
      : row
  );
  saveBtcTransactions();
  if (updatedRow) {
    renderBtcTransactionSummary();
    renderBtcTransactionValue(updatedRow);
    renderDashboard();
  }
});

document.querySelector("#btcTransactionsTable").addEventListener("change", (event) => {
  const input = event.target.closest("[data-btc-id]");
  if (!input) return;

  btcTransactions = btcTransactions.map((row) =>
    row.id === input.dataset.btcId
      ? {
          ...row,
          [input.dataset.field]: input.dataset.field === "date" || input.dataset.field === "side" ? input.value : parseTransactionNumber(input.value),
        }
      : row
  );
  saveBtcTransactions();
  renderBtcTransactions();
  renderDashboard();
});

document.querySelector("#btcTransactionsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-btc-id]");
  if (!button) return;

  btcTransactions = btcTransactions.filter((row) => row.id !== button.dataset.deleteBtcId);
  saveBtcTransactions();
  renderBtcTransactions();
  renderDashboard();
});

document.querySelector("#addGoldTransactionButton").addEventListener("click", () => {
  goldTransactions.unshift({
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    side: "buy",
    units: 0,
    price: 0,
  });
  saveGoldTransactions();
  renderGoldTransactions();
  renderDashboard();
});

document.querySelector("#goldTransactionsTable").addEventListener("input", (event) => {
  const input = event.target.closest("[data-gold-id]");
  if (!input) return;

  let updatedRow = null;
  goldTransactions = goldTransactions.map((row) =>
    row.id === input.dataset.goldId
      ? (updatedRow = {
          ...row,
          [input.dataset.field]: input.dataset.field === "date" || input.dataset.field === "side" ? input.value : parseTransactionNumber(input.value),
        })
      : row
  );
  saveGoldTransactions();
  if (updatedRow) {
    renderGoldTransactionSummary();
    renderGoldTransactionValue(updatedRow);
    renderDashboard();
  }
});

document.querySelector("#goldTransactionsTable").addEventListener("change", (event) => {
  const input = event.target.closest("[data-gold-id]");
  if (!input) return;

  goldTransactions = goldTransactions.map((row) =>
    row.id === input.dataset.goldId
      ? {
          ...row,
          [input.dataset.field]: input.dataset.field === "date" || input.dataset.field === "side" ? input.value : parseTransactionNumber(input.value),
        }
      : row
  );
  saveGoldTransactions();
  renderGoldTransactions();
  renderDashboard();
});

document.querySelector("#goldTransactionsTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-gold-id]");
  if (!button) return;

  goldTransactions = goldTransactions.filter((row) => row.id !== button.dataset.deleteGoldId);
  saveGoldTransactions();
  renderGoldTransactions();
  renderDashboard();
});

document.querySelector("#holdingDialog").addEventListener("close", () => {
  editingHoldingId = null;
  setHoldingDialogMode("add");
  document.querySelector("#holdingForm").reset();
  document.querySelector("#assetDividend").value = 0;
  syncHoldingFieldsForType(document.querySelector("#assetType").value);
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderTable();
  });
});

renderAll();
loadFromSheet({ silent: true });
