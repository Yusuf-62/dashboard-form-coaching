const DATA_URL = "data/coaching.json";

// Kolom yang dinilai. Kolom identitas, tanggal, outlet, waktu, dan target tidak dihitung.
const INDICATORS = [
  "Active", "Ada", "All", "Confirm", "Dips", "HO",
  "Hub Baik", "POP", "Promo", "SL<2 menit", "Scan", "Vs Target"
];

const $ = (id) => document.getElementById(id);
let allRows = [];
let activeRange = "all";

function textValue(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseDate(row) {
  // Utamakan Tanggal. Jika kosong/null, gunakan Stop Selling sebagai fallback.
  const raw = textValue(row["Tanggal"]) || textValue(row["Stop Selling"]);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
}

function formatDate(date) {
  if (!date) return "Tanggal tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric"
  }).format(date);
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value);
}

function getGrade(score) {
  // Ambang sesuai ketentuan: A = 16; B = 12 sampai kurang dari 16; C < 12.
  if (score >= 16) return { grade: "A", label: "Sangat baik", css: "grade-a" };
  if (score >= 12) return { grade: "B", label: "Perlu dipertahankan", css: "grade-b" };
  return { grade: "C", label: "Perlu peningkatan", css: "grade-c" };
}

function getSelectedRows() {
  const selectedName = $("salesman-filter").value;
  const selectedOutlet = $("outlet-filter").value;
  const from = $("date-from").value ? new Date(`${$("date-from").value}T00:00:00`) : null;
  const to = $("date-to").value ? new Date(`${$("date-to").value}T23:59:59.999`) : null;

  return allRows.filter(row => {
    if (selectedName && textValue(row["Nama"]) !== selectedName) return false;
    if (selectedOutlet && textValue(row["Nama Outlet"]) !== selectedOutlet) return false;
    const date = parseDate(row);
    // Jika rentang tanggal dipakai, baris tanpa tanggal tidak dapat masuk rentang.
    if ((from || to) && !date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
}

function updateOutletOptions(preserveSelection = true) {
  const select = $("outlet-filter");
  const previous = preserveSelection ? select.value : "";
  const selectedName = $("salesman-filter").value;
  const scopedRows = allRows.filter(row =>
    !selectedName || textValue(row["Nama"]) === selectedName
  );
  const outlets = uniqueSorted(scopedRows.map(row => textValue(row["Nama Outlet"])));

  select.innerHTML = '<option value="">Semua Toko</option>' +
    outlets.map(outlet => `<option value="${escapeHtml(outlet)}">${escapeHtml(outlet)}</option>`).join("");
  select.value = previous && outlets.includes(previous) ? previous : "";
}

function renderIndicators(rows) {
  const host = $("indicator-list");
  if (!rows.length) {
    host.innerHTML = '<p class="empty-state">Tidak ada data pada filter yang dipilih.</p>';
    return 0;
  }

  let totalAverage = 0;
  let availableIndicators = 0;

  host.innerHTML = INDICATORS.map(name => {
    const values = rows.map(row => numericValue(row[name])).filter(v => v !== null);
    if (!values.length) return "";
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    totalAverage += average;
    availableIndicators += 1;
    const pct = Math.max(0, Math.min(100, average * 100));
    return `
      <div class="indicator-row">
        <span class="indicator-name">${escapeHtml(name)}</span>
        <span class="indicator-value">${formatNumber(average, 3)}</span>
        <div class="indicator-meter"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join("");

  if (!availableIndicators) {
    host.innerHTML = '<p class="empty-state">Belum ada nilai numerik pada indikator.</p>';
    return 0;
  }
  return totalAverage;
}

function findNote(row) {
  const possible = ["Catatan", "Catatan Coaching", "Keterangan", "Hasil Coaching", "Notes"];
  for (const key of possible) {
    const value = textValue(row[key]);
    if (value) return value;
  }
  return "";
}

function renderNotes(rows) {
  const host = $("notes-list");
  const withDates = rows.map(row => ({ row, date: parseDate(row) }))
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  $("note-count").textContent = `${withDates.length} kunjungan`;
  if (!withDates.length) {
    host.innerHTML = '<p class="empty-state">Tidak ada kunjungan pada rentang tanggal ini.</p>';
    return;
  }

  host.innerHTML = withDates.map(({ row, date }) => {
    const note = findNote(row);
    const outlet = textValue(row["Nama Outlet"]) || "Outlet tidak dicantumkan";
    const depo = textValue(row["Depo"]);
    const type = textValue(row["Tipe Coaching"]);
    const time = textValue(row["Stop Selling"]) || textValue(row["Start Selling"]);
    return `
      <article class="note-card">
        <div class="note-top">
          <span class="note-date">${escapeHtml(formatDate(date))}</span>
          <span class="note-depo">${escapeHtml(depo)}</span>
        </div>
        <div class="note-title">${escapeHtml(outlet)}</div>
        <p class="note-text">${escapeHtml(note || "Belum ada catatan untuk kunjungan ini.")}</p>
        <div class="note-meta">${escapeHtml(type)}${time ? " · " + escapeHtml(time) : ""}</div>
      </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderSalesmanProfile() {
  const selectedName = $("salesman-filter").value;
  const profile = allRows.find(row => textValue(row["Nama"]) === selectedName);

  if (!selectedName || !profile) {
    $("profile-type").textContent = selectedName ? "Data tipe belum tersedia" : "Pilih salesman";
    $("profile-depo").textContent = "—";
    return;
  }

  const rawType = textValue(profile["Tipe Salesman"]) || textValue(profile["Jabatan"]);
  // Khusus tipe yang mengandung BH, tampilkan label ringkas "BH".
  const displayType = /\bBH\b/i.test(rawType) ? "BH" : (rawType || "Tidak tersedia");
  $("profile-type").textContent = displayType;
  $("profile-depo").textContent = textValue(profile["Depo"]) || "Tidak tersedia";
}

function render() {
  renderSalesmanProfile();
  const rows = getSelectedRows();
  $("visit-count").textContent = formatNumber(rows.length, 0);

  const totalScore = renderIndicators(rows);
  $("total-score").textContent = formatNumber(totalScore);
  const grade = getGrade(totalScore);
  const gradeCard = document.querySelector(".grade-card");
  gradeCard.classList.remove("grade-a", "grade-b", "grade-c");
  gradeCard.classList.add(grade.css);

  $("overall-grade").textContent = rows.length ? grade.grade : "—";
  $("grade-description").textContent = rows.length
    ? `${grade.label} · berdasarkan ${rows.length} kunjungan`
    : "Tidak ada data untuk filter ini";
  $("grade-score").textContent = `${formatNumber(totalScore)} / 16`;
  $("grade-progress").style.width = `${Math.max(0, Math.min(100, totalScore / 16 * 100))}%`;

  renderNotes(rows);
}

function setQuickRange(days) {
  activeRange = String(days);
  document.querySelectorAll(".quick-ranges button").forEach(button => {
    button.classList.toggle("active", button.dataset.range === activeRange);
  });

  if (days === "all") {
    $("date-from").value = "";
    $("date-to").value = "";
  } else {
    const dates = allRows.map(parseDate).filter(Boolean).sort((a, b) => a - b);
    const end = dates.length ? dates[dates.length - 1] : new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - Number(days) + 1);
    $("date-from").value = toInputDate(start);
    $("date-to").value = toInputDate(end);
  }
  render();
}

function toInputDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function init() {
  try {
    $("loading-message").textContent = "Mengambil data coaching...";
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Gagal mengambil ${DATA_URL} (HTTP ${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Format coaching.json harus berupa JSON array.");

    allRows = data;
    const names = uniqueSorted(allRows.map(row => textValue(row["Nama"])));
    $("salesman-filter").innerHTML = '<option value="">Semua Salesman</option>' +
      names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    updateOutletOptions(false);

    const validDates = allRows.map(parseDate).filter(Boolean).sort((a, b) => a - b);
    if (validDates.length) {
      $("date-from").min = toInputDate(validDates[0]);
      $("date-to").max = toInputDate(validDates[validDates.length - 1]);
    }

    $("updated-at").textContent = `Data tersedia: ${allRows.length} kunjungan · ${new Date().toLocaleString("id-ID")}`;
    $("data-status").textContent = `Sumber: ${DATA_URL}`;
    render();
  } catch (error) {
    $("error-message").textContent = `${error.message}. Pastikan file data/coaching.json tersedia dan dashboard dibuka melalui GitHub Pages atau server lokal.`;
    $("error-message").classList.remove("hidden");
    $("loading-message").textContent = "Data belum dapat dimuat";
    $("indicator-list").innerHTML = '<p class="empty-state">Periksa file JSON dan koneksi.</p>';
    console.error(error);
  } finally {
    setTimeout(() => $("loading-screen").classList.add("done"), 500);
  }
}

$("salesman-filter").addEventListener("change", () => {
  updateOutletOptions(false);
  render();
});
$("outlet-filter").addEventListener("change", render);
$("date-from").addEventListener("change", () => { activeRange = "custom"; render(); });
$("date-to").addEventListener("change", () => { activeRange = "custom"; render(); });
document.querySelectorAll(".quick-ranges button").forEach(button => {
  button.addEventListener("click", () => setQuickRange(button.dataset.range));
});

init();


// Navigation between Dashboard and embedded Microsoft Forms.
(function setupAppNavigation() {
  const openButton = document.getElementById("menu-open");
  const closeButton = document.getElementById("menu-close");
  const backdrop = document.getElementById("drawer-backdrop");
  const drawerItems = document.querySelectorAll(".drawer-item");
  const dashboardView = document.getElementById("dashboard-view");
  const formView = document.getElementById("form-view");
  const formBack = document.getElementById("form-back");

  if (!openButton || !dashboardView || !formView) return;

  function closeDrawer() {
    document.body.classList.remove("drawer-open");
    document.getElementById("app-drawer")?.setAttribute("aria-hidden", "true");
  }

  function showView(name) {
    const isForm = name === "form";
    dashboardView.classList.toggle("view-active", !isForm);
    formView.classList.toggle("view-active", isForm);
    document.body.classList.toggle("form-active", isForm);
    drawerItems.forEach(item => item.classList.toggle("active", item.dataset.view === name));
    closeDrawer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  openButton.addEventListener("click", () => {
    document.body.classList.add("drawer-open");
    document.getElementById("app-drawer")?.setAttribute("aria-hidden", "false");
  });
  closeButton?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);
  drawerItems.forEach(item => item.addEventListener("click", () => showView(item.dataset.view)));
  formBack?.addEventListener("click", () => showView("dashboard"));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDrawer();
  });
})();
