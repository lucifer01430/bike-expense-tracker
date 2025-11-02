const LOGIN_KEY = "bikexp_logged_in";
const USERS_KEY = "bikexp_users_v1";
const WELCOME_KEY_PREFIX = "bikexp_welcome_shown_";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  const amount = Number(value) || 0;
  return moneyFormatter.format(amount);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDateLabel(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString(undefined, options) : value || "-";
}

function setText(target, text) {
  const el = typeof target === "string" ? document.getElementById(target) : target;
  if (el) {
    el.textContent = text;
  }
}

const FUEL_ENTRY_TYPES = ["Fuel", "CNG"];
const FUEL_UNITS = { Fuel: "L", CNG: "kg" };
const quantityFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function isFuelCategory(category) {
  return FUEL_ENTRY_TYPES.includes(category);
}

function getFuelUnit(category) {
  return FUEL_UNITS[category] || "L";
}

function parseOptionalNumber(value, { allowZero = false } = {}) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  if (!allowZero && num === 0) return null;
  return num;
}

function formatFuelQuantity(value, category) {
  if (!isFuelCategory(category)) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  const formatted = quantityFormatter.format(num);
  return `${formatted} ${getFuelUnit(category)}`;
}

function formatEntryFuelQuantity(entry) {
  if (!entry) return "-";
  return formatFuelQuantity(entry.liters, entry.category) || "-";
}

function buildEntryMeta(entry) {
  if (!entry) return "-";
  const parts = [];
  if (entry.category) parts.push(entry.category);
  const quantity = formatFuelQuantity(entry.liters, entry.category);
  if (quantity) parts.push(quantity);
  if (entry.odo) parts.push(`${entry.odo} km`);
  return parts.join(" \u2022 ") || "-";
}

function computeMileageRows(entries, category) {
  const rows = [];
  for (let i = 1; i < entries.length; i++) {
    const previous = entries[i - 1];
    const current = entries[i];
    const prevOdo = parseOptionalNumber(previous.odo, { allowZero: true });
    const currOdo = parseOptionalNumber(current.odo, { allowZero: true });
    const quantityValue = parseOptionalNumber(previous.liters);
    if (prevOdo === null || currOdo === null || quantityValue === null) continue;
    if (currOdo <= prevOdo) continue;
    const distance = currOdo - prevOdo;
    if (distance <= 0) continue;
    const avg = (distance / quantityValue).toFixed(1);
    const quantityLabel = formatFuelQuantity(previous.liters, category);
    if (!quantityLabel) continue;
    rows.push(`
        <tr>
          <td>${formatDateLabel(previous.date, { day: "2-digit", month: "short" })} \u2013 ${formatDateLabel(current.date, { day: "2-digit", month: "short" })}</td>
          <td>${quantityFormatter.format(distance)} km</td>
          <td>${quantityLabel}</td>
          <td><b>${avg}</b> km/${getFuelUnit(category)}</td>
        </tr>
      `);
  }
  return rows;
}


function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function findUser(username) {
  return loadUsers().find((u) => u.username === username);
}

// Check auth
(function () {
  const logged = localStorage.getItem(LOGIN_KEY);
  if (!logged) {
    // not logged in -> redirect to login page
    location.href = "index.html";
    return;
  }
  const user = findUser(logged);
  if (!user) {
    // user entry missing -> logout & redirect
    localStorage.removeItem(LOGIN_KEY);
    location.href = "index.html";
    return;
  }
  // show user info
  setText("userTag", `${user.displayName} | ${user.username}`);
  setText("welcomeTitle", `Welcome, ${user.displayName}`);
  setText(
    "welcomeDesc",
    "Stay in control of every rupee you invest in your vehicle - fuel, service, and upgrades all in one workspace."
  );
  const joinLabel = formatDateLabel(user.createdAt, { month: "short", year: "numeric" });
  setText("welcomeBadge", joinLabel ? `Member since ${joinLabel}` : "Member");

  const welcomeKey = `${WELCOME_KEY_PREFIX}${user.username}`;
  const welcomeModalEl = document.getElementById("welcomeModal");
  if (!sessionStorage.getItem(welcomeKey) && welcomeModalEl && typeof bootstrap !== "undefined" && bootstrap.Modal) {
    sessionStorage.setItem(welcomeKey, "1");
    const welcomeModal = bootstrap.Modal.getOrCreateInstance(welcomeModalEl, {
      backdrop: "static",
      keyboard: false,
    });
    welcomeModal.show();
  }
  // you may load user's expense data from user.dataKey here
})();

// logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(LOGIN_KEY);
  location.href = "index.html";
});

// Quick actions
const addEntryBtn = document.getElementById("addEntryBtn");
if (addEntryBtn) {
  addEntryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const form = document.getElementById("addExpenseForm");
    if (form) {
      form.reset();
    }
    const editField = document.getElementById("editId");
    if (editField) {
      editField.value = "";
    }
    if (typeof toggleFuelFields === "function") {
      toggleFuelFields();
    }
    const modalElement = document.getElementById("addModal");
    if (modalElement && typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
      setTimeout(() => document.getElementById("expDate")?.focus(), 220);
    }
  });
}

const openListBtn = document.getElementById("openList");
if (openListBtn) {
  openListBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const listTabTrigger = document.querySelector('#dashTabs [data-bs-target="#tabList"]');
    if (listTabTrigger && typeof bootstrap !== "undefined" && bootstrap.Tab) {
      const tab = bootstrap.Tab.getOrCreateInstance(listTabTrigger);
      tab.show();
    }
    const listSection = document.getElementById("tabList");
    listSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

const welcomeContinueBtn = document.getElementById("welcomeContinue");
if (welcomeContinueBtn) {
  welcomeContinueBtn.addEventListener("click", () => {
    const modalEl = document.getElementById("welcomeModal");
    if (!modalEl || typeof bootstrap === "undefined" || !bootstrap.Modal) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
  });
}

// App Area JavaScript

// ========== Expense System ================
function uuid() {
  return "id_" + Math.random().toString(36).substr(2, 9);
}
function loadData() {
  const logged = localStorage.getItem(LOGIN_KEY);
  if (!logged) return { entries: [] };
  const user = findUser(logged);
  if (!user) return { entries: [] };

  try {
    const raw = localStorage.getItem(user.dataKey);
    const parsed = raw ? JSON.parse(raw) : { entries: [] };
    // ensure unique ids, remove duplicates
    const uniq = [];
    const seen = new Set();
    parsed.entries.forEach((e) => {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        uniq.push(e);
      }
    });
    parsed.entries = uniq;
    return parsed;
  } catch (err) {
    console.error("loadData error", err);
    return { entries: [] };
  }
}

function saveData(data) {
  const logged = localStorage.getItem(LOGIN_KEY);
  if (!logged) return;
  const user = findUser(logged);
  if (!user) return;
  localStorage.setItem(user.dataKey, JSON.stringify(data));
}

function updateQuickActionsPanel() {
  const panel = document.querySelector(".quick-actions");
  if (!panel) return;

  const data = loadData();
  const entries = data.entries || [];
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let monthTotal = 0;
  let monthCount = 0;
  const categoryTotals = {};
  let latestEntry = null;
  let latestDate = null;

  entries.forEach((entry) => {
    const amount = Number(entry.amount) || 0;
    const entryDate = parseDate(entry.date);

    if (entry.date && entry.date.startsWith(monthKey)) {
      monthTotal += amount;
      monthCount += 1;
    }

    if (entry.category) {
      categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + amount;
    }

    if (entryDate && (!latestDate || entryDate > latestDate)) {
      latestDate = entryDate;
      latestEntry = entry;
    }
  });

  const monthLabel = monthCount
    ? `${monthCount} ${monthCount === 1 ? "entry" : "entries"} this month`
    : "Log your first entry";
  setText("qaMonthSpend", formatMoney(monthTotal));
  setText("qaMonthEntries", monthLabel);

  const lastEntryLabel = latestEntry
    ? `${latestEntry.category || "Entry"} | ${formatDateLabel(latestEntry.date, {
        day: "2-digit",
        month: "short",
      })}`
    : "No entries yet";
  setText("qaLastEntry", lastEntryLabel);

  const quickNoteEl = document.getElementById("qaQuickNote");
  if (quickNoteEl) {
    if (latestDate) {
      const diffDays = Math.max(0, Math.floor((now - latestDate) / 86400000));
      let message = "Great! You are up to date today.";
      if (diffDays === 1) message = "Last logged expense was yesterday.";
      else if (diffDays > 1) message = `Last logged expense was ${diffDays} days ago.`;
      quickNoteEl.textContent = message;
    } else {
      quickNoteEl.textContent = "Start logging your first vehicle expense to see insights here.";
    }
  }

  const topCategoryEntry = Object.entries(categoryTotals)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])[0];
  const topCategoryLabel = topCategoryEntry
    ? `${topCategoryEntry[0]} | ${formatMoney(topCategoryEntry[1])}`
    : "No spend logged";
  setText("qaTopCategory", topCategoryLabel);
}

function renderEntries() {
  const tbody = document.getElementById("entriesBody");
  const data = loadData();
  tbody.innerHTML = "";
  let total = 0;

  // Sort by date (latest first)
  data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  data.entries.forEach((entry) => {
    const amount = Number(entry.amount) || 0;
    total += amount;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.category}</td>
      <td>${formatMoney(amount)}</td>
      <td>${formatEntryFuelQuantity(entry)}</td>
      <td>${entry.odo ? `${entry.odo} km` : "-"}</td>
      <td>${entry.notes?.trim() || "-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editEntry('${entry.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('${entry.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const msg = data.entries.length
    ? `Total: ${formatMoney(total)} (${data.entries.length} ${data.entries.length === 1 ? "entry" : "entries"})`
    : "No entries yet.";
  setText("summaryStats", msg);
}


function deleteEntry(id) {
  if (!confirm("Delete this entry?")) return;
  const data = loadData();
  data.entries = data.entries.filter((e) => e.id !== id);
  saveData(data);
  renderEntries();
}

document.getElementById("addExpenseForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const date = document.getElementById("expDate").value;
  const cat = document.getElementById("expCategory").value;
  const amt = Number(document.getElementById("expAmount").value);
  const notes = document.getElementById("expNotes").value.trim();
  const quantityInput = document.getElementById("expLiters");
  const odoInput = document.getElementById("expOdo");
  const liters = isFuelCategory(cat) ? parseOptionalNumber(quantityInput?.value) : null;
  const odo = isFuelCategory(cat) ? parseOptionalNumber(odoInput?.value) : null;
  const editId = document.getElementById("editId").value;

  if (!date || !cat || amt <= 0)
    return alert("Please fill all required fields.");

  const data = loadData();

  if (editId) {
    // UPDATE existing entry
    const index = data.entries.findIndex((x) => x.id === editId);
    if (index > -1) {
      data.entries[index] = {
        ...data.entries[index],
        date,
        category: cat,
        amount: amt,
        notes,
        liters,
        odo,
      };
    }
    alert("Entry updated successfully.");
  } else {
    // ADD new entry
    data.entries.push({
      id: uuid(),
      date,
      category: cat,
      amount: amt,
      notes,
      liters,
      odo,
    });
    alert("New entry added.");
  }

  // Save + Reset
  saveData(data);
  document.getElementById("editId").value = ""; // clear edit mode
  e.target.reset();
  bootstrap.Modal.getInstance(document.getElementById("addModal")).hide();
  renderEntries();
});

function editEntry(id) {
  const data = loadData();
  const e = data.entries.find((x) => x.id === id);
  if (!e) return;

  document.getElementById("editId").value = e.id;
  document.getElementById("expDate").value = e.date;
  document.getElementById("expCategory").value = e.category;
  document.getElementById("expAmount").value = e.amount;
  document.getElementById("expNotes").value = e.notes || "";

  // fill fuel fields if exist
  if (document.getElementById("expLiters")) {
    document.getElementById("expLiters").value = e.liters ?? "";
  }
  if (document.getElementById("expOdo")) {
    document.getElementById("expOdo").value = e.odo ?? "";
  }

  toggleFuelFields(); // show/hide fields properly
  new bootstrap.Modal("#addModal").show();
}

function confirmDelete(id) {
  if (confirm("Are you sure you want to delete this entry?")) {
    deleteEntry(id);
    renderEntries();
  }
}

// ===== Utilities for month handling =====
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-11

function ymKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
function firstDayOfMonth(y, m) {
  return new Date(y, m, 1).getDay();
} // 0 Sun - 6 Sat
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function getMonthEntries(y, m) {
  const data = loadData();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return data.entries.filter((e) => {
    const d = new Date(e.date + "T00:00:00");
    return d >= start && d <= end;
  });
}

function formatINR(value, withSymbol = false, fractionDigits = 0) {
  const amount = Number(value) || 0;
  const formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  const formatted = formatter.format(amount);
  return withSymbol ? `\u20B9${formatted}` : formatted;
}

// ===== Calendar render =====
function renderCalendar() {
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";
  const y = viewYear;
  const m = viewMonth;

  const monthName = new Date(y, m, 1).toLocaleString("en-US", {
    month: "long",
  });
  document.getElementById("calTitle").innerText = `${monthName} ${y}`;

  const entries = getMonthEntries(y, m);
  const entriesByDay = {};
  let monthTotal = 0;
  entries.forEach((entry) => {
    const dayNum = Number(entry.date.split("-")[2]);
    if (!entriesByDay[dayNum]) entriesByDay[dayNum] = [];
    entriesByDay[dayNum].push(entry);
    monthTotal += Number(entry.amount);
  });

  const startOffset = firstDayOfMonth(y, m);
  const totalDays = daysInMonth(y, m);

  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    if (i < startOffset || i >= startOffset + totalDays) {
      cell.className = "cal-cell cal-empty";
      grid.appendChild(cell);
      continue;
    }

    const day = i - startOffset + 1;
    cell.className = "cal-cell";
    const dayEntries = (entriesByDay[day] || []).slice().sort((a, b) => Number(b.amount) - Number(a.amount));
    let entriesMarkup = "";
    const maxEntries = 3;
    dayEntries.slice(0, maxEntries).forEach((entry) => {
      const catClass = (entry.category || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      entriesMarkup += `
        <span class="cal-entry cal-entry--${catClass}">
          <span class="cal-entry__label">${entry.category || "Entry"}</span>
          <span class="cal-entry__amount">${formatINR(entry.amount, true)}</span>
        </span>
      `;
    });
    if (dayEntries.length > maxEntries) {
      entriesMarkup += `<span class="cal-entry cal-entry--more">+${dayEntries.length - maxEntries} more</span>`;
    }
    cell.innerHTML = `
      <div class="cal-day">${day}</div>
      ${entriesMarkup ? `<div class="cal-entries">${entriesMarkup}</div>` : ""}
    `;

    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => openDayModal(y, m, day));
    grid.appendChild(cell);
  }

  const monthSummary = entries.length
    ? `Month total: ${formatINR(monthTotal, true)} \u2022 ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
    : "No entries this month.";
  document.getElementById("monthTotalText").innerText = monthSummary;
}

function changeCalendarMonth(delta) {
  if (!Number.isInteger(delta)) return;
  const next = new Date(viewYear, viewMonth + delta, 1);
  viewYear = next.getFullYear();
  viewMonth = next.getMonth();
  renderCalendar();
  renderInsights();
  renderMileageBreakdown();
}

const calPrevBtn = document.getElementById("calPrev");
if (calPrevBtn) {
  calPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));
}
const calNextBtn = document.getElementById("calNext");
if (calNextBtn) {
  calNextBtn.addEventListener("click", () => changeCalendarMonth(1));
}

const dayModalTemplate = `
<div class="modal fade" id="dayModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content day-modal">
      <div class="modal-header">
        <h5 class="modal-title" id="dayModalTitle">Day</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body" id="dayModalBody">No entries for this day.</div>
      <div class="modal-footer day-modal__footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>`;

function ensureDayModalExists() {
  if (!document.getElementById("dayModal")) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = dayModalTemplate;
    document.body.appendChild(wrapper.firstElementChild);
  }
}

function openDayModal(year, month, day) {
  ensureDayModalExists();
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const entries = loadData().entries
    .filter((entry) => entry.date === dateStr)
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  const modalEl = document.getElementById("dayModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const titleEl = document.getElementById("dayModalTitle");
  const bodyEl = document.getElementById("dayModalBody");
  const footerEl = modalEl.querySelector(".modal-footer");
  titleEl.textContent = new Date(`${dateStr}T00:00:00`).toDateString();

  if (!entries.length) {
    bodyEl.innerHTML = '<div class="text-muted text-center py-3">No entries for this day.</div>';
    footerEl.innerHTML = '<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
    modal.show();
    return;
  } else {
    const dayTotal = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const items = entries
      .map(
        (entry) => `
        <article class="day-entry">
          <div class="day-entry__header">
            <div>
              <div class="day-entry__category">${entry.category || "Entry"}</div>
              <div class="day-entry__amount">${formatINR(entry.amount, true)}</div>
            </div>
            <div class="day-entry__actions">
              <button class="btn btn-outline-primary btn-sm" data-entry-edit="${entry.id}">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-outline-danger btn-sm" data-entry-delete="${entry.id}">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
          ${
            entry.notes
              ? `<div class="day-entry__note">${entry.notes}</div>`
              : ""
          }
          <div class="day-entry__meta">
            ${buildEntryMeta(entry)}
          </div>
        </article>
      `
      )
      .join("");
    bodyEl.innerHTML = `<div class="day-entry-list">${items}</div>`;

    footerEl.innerHTML = `
      <div class="day-summary">
        <div>
          <div class="day-summary__label">Daily total</div>
          <div class="day-summary__value">${formatINR(dayTotal, true)}</div>
        </div>
        <div class="day-summary__meta">${entries.length} ${entries.length === 1 ? "entry" : "entries"}</div>
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    `;

    bodyEl.querySelectorAll("[data-entry-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-entry-delete");
        deleteEntry(id);
        modal.hide();
        setTimeout(() => {
          renderCalendar();
          renderInsights();
          renderMileageBreakdown();
          openDayModal(year, month, day);
        }, 150);
      });
    });

    bodyEl.querySelectorAll("[data-entry-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-entry-edit");
        modal.hide();
        editEntry(id);
      });
    });
  }

  modal.show();
}

// ===== Insights (Chart) =====
let catChart;
function computeMonthStats() {
  const list = getMonthEntries(viewYear, viewMonth);
  const totals = { Fuel: 0, CNG: 0, Service: 0, Modification: 0, Other: 0 };
  const dayTotals = {};
  let maxDay = null;
  let total = 0;

  list.forEach((entry) => {
    totals[entry.category] = (totals[entry.category] || 0) + Number(entry.amount);
    const dayKey = entry.date.split('-')[2];
    dayTotals[dayKey] = (dayTotals[dayKey] || 0) + Number(entry.amount);
    total += Number(entry.amount);
  });

  if (Object.keys(dayTotals).length) {
    const [day, amount] = Object.entries(dayTotals).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    maxDay = { day: Number(day), amount: Number(amount) };
  }

  return { totals, total, maxDay, count: list.length, list };
}

function renderInsights() {
  const stats = computeMonthStats();
  const summaryParts = [];
  if (stats.count) {
    summaryParts.push(`Total ${formatINR(stats.total, true)}`);
    summaryParts.push(`${stats.count} ${stats.count === 1 ? 'entry' : 'entries'}`);
    if (stats.maxDay) {
      summaryParts.push(`Max spend day: ${stats.maxDay.day}`);
    }
  } else {
    summaryParts.push('No entries this month.');
  }

  const mileageBadges = [];
  const monthEntries = stats.list || [];
  FUEL_ENTRY_TYPES.forEach((fuelCategory) => {
    const fuels = monthEntries
      .filter((entry) => entry.category === fuelCategory)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (fuels.length < 2) return;
    const first = fuels[0];
    const last = fuels[fuels.length - 1];
    const distance = (Number(last.odo) || 0) - (Number(first.odo) || 0);
    const quantityUsed = fuels.slice(1).reduce((sum, entry) => sum + (Number(entry.liters) || 0), 0);
    if (distance > 0 && quantityUsed > 0) {
      const avgMileage = (distance / quantityUsed).toFixed(1);
      mileageBadges.push(
        `<span class="badge rounded-pill bg-success ms-2 px-3 py-2 shadow-sm">Avg mileage (${fuelCategory}): <strong>${avgMileage}</strong> km/${getFuelUnit(fuelCategory)}</span>`
      );
    }
  });

  const insightsSummary = document.getElementById('insightsSummary');
  insightsSummary.innerHTML = `
    <span>${summaryParts.join(' \u2022 ')}</span>
    ${mileageBadges.join('')}
  `;

  const labels = Object.keys(stats.totals);
  const data = Object.values(stats.totals);
  const ctx = document.getElementById('categoryChart');
  if (catChart) catChart.destroy();

  catChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Amount (\u20B9)',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatINR(context.parsed.y, true),
          },
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Amount (\u20B9)' } },
        x: { title: { display: true, text: 'Category' } },
      },
    },
  });
}

function toggleFuelFields() {
  const categorySelect = document.getElementById("expCategory");
  if (!categorySelect) return;
  const category = categorySelect.value;
  const showFields = isFuelCategory(category);
  document.querySelectorAll(".fuel-fields").forEach((el) => {
    el.classList.toggle("d-none", !showFields);
  });
  const label = document.getElementById("expLitersLabel");
  const quantityInput = document.getElementById("expLiters");
  if (label) {
    if (showFields) {
      label.textContent = `${category} Quantity (${getFuelUnit(category)})`;
    } else {
      label.textContent = "Fuel Quantity (L)";
    }
  }
  if (quantityInput) {
    if (showFields) {
      quantityInput.placeholder = getFuelUnit(category) === "kg" ? "e.g. 3.2" : "e.g. 5.6";
    } else {
      quantityInput.placeholder = "e.g. 5.6";
      quantityInput.value = "";
    }
  }
  if (!showFields) {
    const odoInput = document.getElementById("expOdo");
    if (odoInput) {
      odoInput.value = "";
    }
  }
}

function renderMileageBreakdown() {
  const wrap = document.getElementById("mileageTableWrap");
  if (!wrap) return;
  const monthEntries = getMonthEntries(viewYear, viewMonth);
  const sections = [];
  let hasFuelEntries = false;
  let hasMileageRows = false;

  FUEL_ENTRY_TYPES.forEach((fuelCategory) => {
    const fuels = monthEntries
      .filter((entry) => entry.category === fuelCategory)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!fuels.length) return;
    hasFuelEntries = true;
    const rows = computeMileageRows(fuels, fuelCategory);
    const header = `<div class="fw-semibold text-body mb-2">${fuelCategory}</div>`;
    if (!rows.length) {
      const message =
        fuels.length < 2
          ? `Add at least two ${fuelCategory.toLowerCase()} entries with odometer data to calculate mileage.`
          : "No valid odometer data found.";
      sections.push(`<div class="mb-3">${header}<div class="text-muted">${message}</div></div>`);
      return;
    }
    hasMileageRows = true;
    const unit = getFuelUnit(fuelCategory);
    sections.push(`
      <div class="mb-4">
        ${header}
        <table class="table table-sm table-bordered align-middle">
          <thead class="table-light">
            <tr><th>Duration</th><th>Distance</th><th>Quantity Used (${unit})</th><th>Average</th></tr>
          </thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `);
  });

  if (!hasFuelEntries) {
    wrap.innerHTML = `<div class="text-muted">No mileage data yet.</div>`;
    return;
  }

  if (!hasMileageRows) {
    wrap.innerHTML =
      sections.join("") || `<div class="text-muted">Add odometer readings to calculate mileage.</div>`;
    return;
  }

  wrap.innerHTML = sections.join("");
}




// ===== Hook into existing list render to keep all in sync =====
const _renderEntries = renderEntries;
renderEntries = function () {
  _renderEntries();
  updateQuickActionsPanel();
  renderCalendar();
  renderInsights();
  renderMileageBreakdown();

};

// Initial boot
renderEntries();

// ===== Filtering + Sorting System =====
function applyFilter() {
  const cat = document.getElementById("filterCat").value;
  const month = document.getElementById("filterMonth").value;
  const sort = document.getElementById("sortBy").value;

  let data = loadData();
  let list = data.entries;

  // --- Filter by Category ---
  if (cat) list = list.filter((e) => e.category === cat);

  // --- Filter by Month ---
  if (month) {
    list = list.filter((e) => e.date.startsWith(month));
  }

  // --- Sorting ---
  list.sort((a, b) => {
    if (sort === "date_desc") return new Date(b.date) - new Date(a.date);
    if (sort === "date_asc") return new Date(a.date) - new Date(b.date);
    if (sort === "amt_desc") return b.amount - a.amount;
    if (sort === "amt_asc") return a.amount - b.amount;
    return 0;
  });

  // --- Render filtered data ---
  drawFilteredList(list);
}

function resetFilter() {
  document.getElementById("filterCat").value = "";
  document.getElementById("filterMonth").value = "";
  document.getElementById("sortBy").value = "date_desc";
  renderEntries();
}

// Draw the filtered table dynamically
function drawFilteredList(list) {
  const tbody = document.getElementById("entriesBody");
  tbody.innerHTML = "";

  if (list.length === 0) {
    setText("summaryStats", "No entries found.");
    return;
  }

  let total = 0;
  list.forEach((entry) => {
    const amount = Number(entry.amount) || 0;
    total += amount;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.category}</td>
      <td>${formatINR(amount, true)}</td>
      <td>${formatEntryFuelQuantity(entry)}</td>
      <td>${entry.odo ? entry.odo : "-"}</td>
      <td>${entry.notes || "-"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editEntry('${entry.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete('${entry.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  setText(
    "summaryStats",
    `Filtered Total: ${formatINR(total, true)} (${list.length} ${list.length === 1 ? "entry" : "entries"})`
  );
}

// ===== Export / Import / Clear All =====
function exportData() {
  const data = loadData();
  if (!data.entries.length) return alert("No data to export!");

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bike_expense_backup.json";
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.entries || !Array.isArray(data.entries)) {
        alert("Invalid file format!");
        return;
      }

      // confirm overwrite
      if (!confirm("This will overwrite your current data. Continue?")) return;

      saveData(data);
      renderEntries();
      alert("Data imported successfully.");
    } catch (err) {
      console.error(err);
      alert("Error reading file!");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (
    confirm(
      "Are you sure you want to clear ALL your data? This cannot be undone."
    )
  ) {
    saveData({ entries: [] });
    renderEntries();
    alert("All data cleared.");
  }
}

async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = 570; // A4 width in points minus margins
  const pageHeight = 780; // A4 height in points minus margins
  let currentY = 40;

  // ===== HEADER =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(33);
  doc.text("Bike Expense Tracker", 40, currentY);
  currentY += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(90);
  doc.text("Monthly Expense Report", 40, currentY);
  currentY += 30;
  doc.setDrawColor(180);
  doc.line(40, currentY, 570, currentY);
  currentY += 20;

  // Function to add new page if needed
  function newPageIfNeeded(blockHeight = 0) {
    if (currentY + blockHeight >= pageHeight) {
      doc.addPage();
      currentY = 40;
    }
  }

  function getScaledDimensions(canvas, targetWidth = 500) {
    const maxHeight = pageHeight - 80;
    let width = Math.min(targetWidth, pageWidth - 40);
    let height = (canvas.height * width) / canvas.width;
    if (height > maxHeight) {
      const scale = maxHeight / height;
      height = maxHeight;
      width *= scale;
    }
    return { width, height };
  }

  // --- Calendar Section ---
  const calTitle = document.getElementById("calTitle")?.cloneNode(true);
  const calGrid = document.getElementById("calGrid")?.cloneNode(true);
  const monthTotal = document.getElementById("monthTotalText")?.cloneNode(true);

  const calSection = document.createElement("div");
  calSection.style.width = "100%";
  if (calTitle) {
    calTitle.style.fontSize = "18px";
    calTitle.style.fontWeight = "600";
    calTitle.style.marginBottom = "15px";
    calSection.appendChild(calTitle);
  }
  if (calGrid) {
    calGrid.style.border = "1px solid #ccc";
    calGrid.style.marginBottom = "15px";
    calGrid.style.width = "100%";
    calGrid.style.display = "grid";
    calGrid.style.gridTemplateColumns = "repeat(7, 1fr)";
    calGrid.style.textAlign = "center";
    calSection.appendChild(calGrid);
  }
  if (monthTotal) calSection.appendChild(monthTotal);

  const tempCal = document.createElement("div");
  tempCal.style.background = "#fff";
  tempCal.style.width = "780px";
  tempCal.appendChild(calSection);
  document.body.appendChild(tempCal);

  const calCanvas = await html2canvas(tempCal, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#fff",
    width: 780,
  });
  const calImgData = calCanvas.toDataURL("image/png");
  const { width: calImgWidth, height: calImgHeight } = getScaledDimensions(calCanvas);
  newPageIfNeeded(calImgHeight);
  doc.addImage(calImgData, "PNG", 40, currentY, calImgWidth, calImgHeight);
  currentY += calImgHeight + 20;
  document.body.removeChild(tempCal);

  // --- Expense Table ---
  const tableClone = document.getElementById("entriesTable")?.cloneNode(true);
  if (tableClone) {
    const lastHeader = tableClone.querySelector("th:last-child");
    if (lastHeader && lastHeader.textContent.trim() === "Actions") lastHeader.remove();
    tableClone.querySelectorAll("td:last-child").forEach((td) => td.remove());
    tableClone.querySelectorAll("button").forEach((btn) => btn.remove());
    tableClone.style.fontSize = "14px";
    tableClone.style.borderCollapse = "collapse";
    tableClone.style.width = "100%";
    tableClone.querySelectorAll("th, td").forEach((cell) => {
      cell.style.padding = "10px";
      cell.style.border = "1px solid #ccc";
      cell.style.textAlign = "left";
    });

    const tableHeader = document.createElement("h5");
    tableHeader.textContent = "Expense List";
    tableHeader.style.margin = "20px 0 10px 0";
    tableHeader.style.fontSize = "16px";

    const tempTable = document.createElement("div");
    tempTable.style.background = "#fff";
    tempTable.style.width = "780px";
    tempTable.appendChild(tableHeader);
    tempTable.appendChild(tableClone);
    document.body.appendChild(tempTable);

    const tableCanvas = await html2canvas(tempTable, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fff",
      width: 780,
    });
    const tableImgData = tableCanvas.toDataURL("image/png");
    const { width: tableImgWidth, height: tableImgHeight } = getScaledDimensions(tableCanvas);
    newPageIfNeeded(tableImgHeight);
    doc.addImage(tableImgData, "PNG", 40, currentY, tableImgWidth, tableImgHeight);
    currentY += tableImgHeight + 20;
    document.body.removeChild(tempTable);
  }

  // --- Insights Section ---
  const insightsSection = document.createElement("div");
  insightsSection.style.marginTop = "40px";
  const insHeader = document.createElement("h5");
  insHeader.textContent = "Insights & Mileage Breakdown";
  insHeader.style.marginBottom = "10px";
  insHeader.style.fontSize = "16px";
  insightsSection.appendChild(insHeader);

  const insightsSummary = document.getElementById("insightsSummary")?.cloneNode(true);
  if (insightsSummary) {
    insightsSummary.style.marginBottom = "15px";
    insightsSummary.style.fontSize = "14px";
    insightsSection.appendChild(insightsSummary);
  }

  const chartCanvas = document.getElementById("categoryChart");
  if (chartCanvas) {
    const chartImage = chartCanvas.toDataURL("image/png", 1.0);
    const imgEl = document.createElement("img");
    imgEl.src = chartImage;
    imgEl.style.width = "80%";
    imgEl.style.display = "block";
    imgEl.style.margin = "0 auto 25px auto";
    insightsSection.appendChild(imgEl);
  }

  const mileageCard = document.getElementById("mileageBreakdownCard")?.cloneNode(true);
  if (mileageCard) {
    mileageCard.style.fontSize = "14px";
    mileageCard.style.marginTop = "15px";
    mileageCard.querySelectorAll("table").forEach((tbl) => {
      tbl.style.borderCollapse = "collapse";
      tbl.style.width = "100%";
      tbl.style.marginBottom = "10px";
    });
    mileageCard.querySelectorAll("th, td").forEach((cell) => {
      cell.style.border = "1px solid #ccc";
      cell.style.padding = "10px";
      cell.style.textAlign = "left";
    });
    insightsSection.appendChild(mileageCard);
  }

  const tempInsights = document.createElement("div");
  tempInsights.style.background = "#fff";
  tempInsights.style.width = "780px";
  tempInsights.appendChild(insightsSection);
  document.body.appendChild(tempInsights);

  const insightsCanvas = await html2canvas(tempInsights, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#fff",
    width: 780,
  });
  const insightsImgData = insightsCanvas.toDataURL("image/png");
  const { width: insightsImgWidth, height: insightsImgHeight } = getScaledDimensions(insightsCanvas);
  newPageIfNeeded(insightsImgHeight);
  doc.addImage(insightsImgData, "PNG", 40, currentY, insightsImgWidth, insightsImgHeight);
  currentY += insightsImgHeight + 20;
  document.body.removeChild(tempInsights);

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Designed & Developed by Harsh Pandey", 40, 830);
    doc.text(`Page ${i} of ${totalPages}`, 500, 830);
  }

  // ===== SAVE FILE =====
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`BikeXP_Report_${dateStr}.pdf`);
}

