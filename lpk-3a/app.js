/* ==========================================================================
   LKP 3A — To-Do List dengan JavaScript Murni (DOM + localStorage)
   Mahasiswa: Yuli Indiyanti (240511130 · TI24D · UMC)
   ========================================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = 'todos';
  const PRIORITY_ORDER = { tinggi: 0, sedang: 1, rendah: 2 };
  const CATEGORIES = ['Kuliah', 'Proyek', 'Pribadi'];

  const SAMPLE_TODOS = [
    {
      teks: 'Selesaikan LKP 3A — To-Do List JavaScript Murni & DOM',
      prioritas: 'tinggi',
      kategori: 'Kuliah',
      selesai: false,
    },
    {
      teks: 'Uji persistensi localStorage dan tangkapan layar Desktop + Mobile',
      prioritas: 'sedang',
      kategori: 'Proyek',
      selesai: false,
    },
    {
      teks: 'Rangkum catatan materi ES6+ & Event Delegation untuk persiapan kuis',
      prioritas: 'rendah',
      kategori: 'Pribadi',
      selesai: true,
    },
  ];

  // ===== STATE =====
  let lastGeneratedId = 0;
  let todos = loadTodos();
  let filterStatus = 'semua';
  let filterCategory = 'Semua';
  let filterPriority = 'semua';
  let searchQuery = '';
  let sortBy = 'terbaru';
  let selectedPriority = 'sedang';
  let selectedCategory = 'Kuliah';
  let editingId = null;
  let lastDeleted = null; // { todo, index }
  let toastTimer = null;

  // ===== DOM ELEMENTS =====
  const form = document.querySelector('#form-todo');
  const input = document.querySelector('#input-todo');
  const formError = document.querySelector('#form-error');
  const list = document.querySelector('#list-todo');
  const stats = document.querySelector('#stats');

  const statPendingNum = document.querySelector('#stat-pending-num');
  const statRatio = document.querySelector('#stat-ratio');
  const statPct = document.querySelector('#stat-pct');
  const progressFill = document.querySelector('#progress-fill');
  const statDoneNote = document.querySelector('#stat-done-note');
  const statHighCount = document.querySelector('#stat-high-count');
  const statHighNote = document.querySelector('#stat-high-note');
  const statCategories = document.querySelector('#stat-categories');
  const heroSummary = document.querySelector('#hero-summary');
  const btnClearCompleted = document.querySelector('#btn-clear-completed');

  const priorityPicker = document.querySelector('#priority-picker');
  const categoryPicker = document.querySelector('#category-picker');
  const statusTabs = document.querySelector('#status-tabs');
  const categoryChips = document.querySelector('.category-chips');
  const searchInput = document.querySelector('#search-input');
  const btnClearSearch = document.querySelector('#btn-clear-search');
  const priorityFilterSelect = document.querySelector('#priority-filter');
  const sortSelect = document.querySelector('#sort-select');

  const countTabSemua = document.querySelector('#count-tab-semua');
  const countTabAktif = document.querySelector('#count-tab-aktif');
  const countTabSelesai = document.querySelector('#count-tab-selesai');
  const visibleCountEl = document.querySelector('#visible-count');
  const totalCountEl = document.querySelector('#total-count');

  const btnFocusComposer = document.querySelector('#btn-focus-composer');
  const btnUserMenu = document.querySelector('#btn-user-menu');
  const userPopover = document.querySelector('#user-popover');
  const btnSeedMenu = document.querySelector('#btn-seed-menu');
  const btnExportJson = document.querySelector('#btn-export-json');

  const btnOpenShortcuts = document.querySelector('#btn-open-shortcuts');
  const shortcutsDialog = document.querySelector('#shortcuts-dialog');
  const btnCloseShortcuts = document.querySelector('#btn-close-shortcuts');
  const btnBackToTop = document.querySelector('#btn-back-to-top');

  const toastEl = document.querySelector('#toast');
  const toastMessageEl = document.querySelector('#toast-message');
  const btnToastUndo = document.querySelector('#btn-toast-undo');
  const btnToastClose = document.querySelector('#btn-toast-close');

  // ===== UTILITIES =====
  function createTodoId() {
    const now = Date.now();
    lastGeneratedId = Math.max(now, lastGeneratedId + 1);
    return lastGeneratedId;
  }

  function normalizeTodo(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const teks = typeof raw.teks === 'string' ? raw.teks.trim() : '';
    if (!teks) return null;
    const id = typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : createTodoId();
    lastGeneratedId = Math.max(lastGeneratedId, id);
    const prioritas = PRIORITY_ORDER[raw.prioritas] !== undefined ? raw.prioritas : 'sedang';
    const kategori = CATEGORIES.includes(raw.kategori) ? raw.kategori : 'Kuliah';
    const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : id;
    return {
      id,
      teks,
      selesai: Boolean(raw.selesai),
      prioritas,
      kategori,
      createdAt,
    };
  }

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeTodo).filter(Boolean);
    } catch {
      return [];
    }
  }

  function simpan() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      showToast('Gagal menyimpan ke localStorage browser.', false);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimestamp(ms) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(ms));
    } catch {
      return '';
    }
  }

  function formatPriorityLabel(prio) {
    if (prio === 'tinggi') return 'Tinggi';
    if (prio === 'rendah') return 'Rendah';
    return 'Sedang';
  }

  // ===== MICRO-CELEBRATION & TOAST =====
  function burstCelebration(originEl) {
    if (!originEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#F3DC8D', '#FAF0BD', '#6FC293', '#F7EFE6'];

    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('span');
      dot.className = 'burst-dot';
      dot.style.left = `${cx}px`;
      dot.style.top = `${cy}px`;
      dot.style.background = colors[i % colors.length];
      document.body.appendChild(dot);

      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.35;
      const dist = 18 + Math.random() * 18;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      const anim = dot.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
        ],
        {
          duration: 380,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'forwards',
        }
      );
      anim.onfinish = () => dot.remove();
    }
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toastEl.dataset.open = 'false';
    setTimeout(() => {
      if (toastEl.dataset.open === 'false') {
        toastEl.hidden = true;
      }
    }, 260);
  }

  function showToast(message, canUndo = false) {
    clearTimeout(toastTimer);
    toastMessageEl.textContent = message;
    btnToastUndo.hidden = !canUndo;
    toastEl.hidden = false;
    requestAnimationFrame(() => {
      toastEl.dataset.open = 'true';
    });
    toastTimer = setTimeout(hideToast, canUndo ? 5000 : 3200);
  }

  // ===== CORE DATA ACTIONS =====
  function tambahTodo(teks, prioritas = selectedPriority, kategori = selectedCategory) {
    const clean = teks.trim();
    if (!clean) return false;
    const baru = {
      id: createTodoId(),
      teks: clean,
      selesai: false,
      prioritas,
      kategori,
      createdAt: Date.now(),
    };
    todos.unshift(baru);
    simpan();
    render(baru.id);
    showToast(`Tugas "${clean.slice(0, 36)}${clean.length > 36 ? '...' : ''}" ditambahkan.`);
    return true;
  }

  function hapusTodo(id) {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    const removed = todos[index];
    lastDeleted = { todo: removed, index };
    todos = todos.filter((t) => t.id !== id);
    if (editingId === id) editingId = null;
    simpan();
    render();
    showToast(`Tugas "${removed.teks.slice(0, 30)}${removed.teks.length > 30 ? '...' : ''}" dihapus.`, true);
  }

  function urungkanHapus() {
    if (!lastDeleted) return;
    const { todo, index } = lastDeleted;
    lastDeleted = null;
    const insertAt = Math.min(index, todos.length);
    todos.splice(insertAt, 0, todo);
    simpan();
    render(todo.id);
    showToast('Tugas berhasil dikembalikan.');
  }

  function toggleSelesai(id, originEl) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.selesai = !todo.selesai;
    simpan();
    render();
    if (todo.selesai) {
      burstCelebration(originEl);
    }
  }

  function editTodo(id, teksBaru) {
    const clean = teksBaru.trim();
    if (!clean) {
      editingId = null;
      render();
      return;
    }
    const todo = todos.find((t) => t.id === id);
    if (todo && todo.teks !== clean) {
      todo.teks = clean;
      simpan();
      showToast('Perubahan tugas disimpan.');
    }
    editingId = null;
    render();
  }

  function bersihkanSelesai() {
    const countDone = todos.filter((t) => t.selesai).length;
    if (countDone === 0) return;
    todos = todos.filter((t) => !t.selesai);
    lastDeleted = null;
    simpan();
    render();
    showToast(`${countDone} tugas selesai dibersihkan.`);
  }

  function muatContoh() {
    const existingTexts = new Set(todos.map((t) => t.teks.toLowerCase()));
    const toAdd = SAMPLE_TODOS.filter((s) => !existingTexts.has(s.teks.toLowerCase())).map((s) => ({
      id: createTodoId(),
      teks: s.teks,
      prioritas: s.prioritas,
      kategori: s.kategori,
      selesai: s.selesai,
      createdAt: Date.now(),
    }));
    if (toAdd.length === 0) {
      showToast('Semua contoh tugas sudah tersedia di daftar.');
      return;
    }
    todos = [...toAdd, ...todos];
    simpan();
    render();
    showToast(`${toAdd.length} contoh tugas siap digunakan.`);
  }

  function eksporJson() {
    const payload = JSON.stringify(todos, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todolist-lpk3a-yuli-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Daftar tugas diekspor sebagai JSON.');
  }

  // ===== FILTER & SORT =====
  function getFilteredTodos() {
    const q = searchQuery.toLowerCase().trim();
    const filtered = todos.filter((t) => {
      if (filterStatus === 'aktif' && t.selesai) return false;
      if (filterStatus === 'selesai' && !t.selesai) return false;
      if (filterCategory !== 'Semua' && t.kategori !== filterCategory) return false;
      if (filterPriority !== 'semua' && t.prioritas !== filterPriority) return false;
      if (q) {
        const hay = `${t.teks} ${t.kategori} ${t.prioritas}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'prioritas') {
        const diff = (PRIORITY_ORDER[a.prioritas] ?? 1) - (PRIORITY_ORDER[b.prioritas] ?? 1);
        if (diff !== 0) return diff;
        return b.createdAt - a.createdAt;
      }
      if (sortBy === 'abjad') {
        return a.teks.localeCompare(b.teks, 'id');
      }
      return b.createdAt - a.createdAt;
    });
  }

  // ===== RENDERING =====
  function renderStats() {
    const total = todos.length;
    const selesai = todos.filter((t) => t.selesai).length;
    const belum = total - selesai;
    const pct = total ? Math.round((selesai / total) * 100) : 0;
    const highActive = todos.filter((t) => !t.selesai && t.prioritas === 'tinggi').length;

    const countsByCat = { Kuliah: 0, Proyek: 0, Pribadi: 0 };
    todos.forEach((t) => {
      if (countsByCat[t.kategori] !== undefined) countsByCat[t.kategori]++;
    });

    stats.textContent = `${belum} tugas belum selesai`;
    statPendingNum.textContent = String(belum);
    statRatio.textContent = `${selesai} dari ${total}`;
    statPct.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;
    statDoneNote.textContent =
      total === 0
        ? 'Belum ada tugas tercatat'
        : belum === 0
          ? 'Seluruh tugas sudah dituntaskan'
          : `${selesai} selesai · ${belum} menunggu aksi`;

    statHighCount.textContent = `${highActive} aktif`;
    statHighNote.textContent =
      highActive === 0 ? 'Tidak ada tugas mendesak' : 'Perlu segera diselesaikan';

    statCategories.textContent = `Kuliah ${countsByCat.Kuliah} · Proyek ${countsByCat.Proyek} · Pribadi ${countsByCat.Pribadi}`;
    btnClearCompleted.disabled = selesai === 0;

    if (total === 0) {
      heroSummary.textContent =
        'Mulai catat tugas kuliah, proyek, atau target pribadi. Data tersimpan otomatis di localStorage browser.';
    } else if (belum === 0) {
      heroSummary.textContent =
        `Hebat! Seluruh ${total} tugas sudah tuntas. Tambahkan tugas baru atau bersihkan tugas selesai kapan saja.`;
    } else {
      heroSummary.textContent =
        `Saat ini ada ${belum} tugas aktif dari total ${total} tugas (${pct}% selesai)${highActive > 0 ? `, dengan ${highActive} tugas berprioritas tinggi` : ''}.`;
    }

    countTabSemua.textContent = String(total);
    countTabAktif.textContent = String(belum);
    countTabSelesai.textContent = String(selesai);
    totalCountEl.textContent = String(total);
  }

  function renderList(enteringId = null) {
    const visible = getFilteredTodos();
    visibleCountEl.textContent = String(visible.length);
    list.innerHTML = '';

    if (todos.length === 0) {
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
          </div>
          <h3>Belum ada tugas tercatat</h3>
          <p>Ketik tugas baru pada kolom di atas, atau muat 3 contoh tugas praktikum untuk langsung mencoba.</p>
          <button type="button" class="btn btn-subtle" data-action="seed-empty">Isi 3 Contoh Tugas</button>
        </li>
      `;
      return;
    }

    if (visible.length === 0) {
      list.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
          </div>
          <h3>Tidak ada tugas yang cocok</h3>
          <p>Coba ubah kata kunci pencarian, tab status, kategori, atau filter prioritas.</p>
          <button type="button" class="btn btn-subtle" data-action="reset-filter">Reset Semua Filter</button>
        </li>
      `;
      return;
    }

    visible.forEach((todo) => {
      const li = document.createElement('li');
      li.className = `todo-item${todo.selesai ? ' selesai' : ''}${todo.id === enteringId ? ' is-entering' : ''}`;
      li.dataset.id = String(todo.id);

      const isEditing = editingId === todo.id;
      const safeText = escapeHtml(todo.teks);
      const prioLabel = formatPriorityLabel(todo.prioritas);

      li.innerHTML = `
        <div class="todo-main">
          <label class="todo-check-label" aria-label="Tandai ${safeText} selesai">
            <input type="checkbox" class="todo-checkbox" ${todo.selesai ? 'checked' : ''} data-id="${todo.id}">
            <span class="todo-check-visual" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5"></path>
              </svg>
            </span>
          </label>
          <div class="todo-body">
            <div class="todo-text-wrap">
              ${
                isEditing
                  ? `<form class="inline-edit-form" data-id="${todo.id}">
                       <input type="text" class="inline-edit-input" value="${safeText}" maxlength="200" aria-label="Edit teks tugas">
                       <button type="submit" class="btn-action" data-action="save-edit" data-id="${todo.id}">Simpan</button>
                       <button type="button" class="btn-action" data-action="cancel-edit">Batal</button>
                     </form>`
                  : `<span class="teks" title="Klik dua kali untuk mengedit">${safeText}</span>`
              }
            </div>
            <div class="todo-meta">
              <span class="badge badge-prio-${escapeHtml(todo.prioritas)}">${prioLabel}</span>
              <span class="badge badge-cat">${escapeHtml(todo.kategori)}</span>
              <span class="todo-time">${escapeHtml(formatTimestamp(todo.createdAt))}</span>
            </div>
          </div>
        </div>
        <div class="todo-actions">
          ${
            isEditing
              ? ''
              : `<button type="button" class="btn-action" data-action="edit" data-id="${todo.id}" aria-label="Edit ${safeText}">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                     <path d="M12 20h9"></path>
                     <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                   </svg>
                   <span>Edit</span>
                 </button>`
          }
          <button type="button" class="btn-action hapus" data-id="${todo.id}" aria-label="Hapus ${safeText}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
            </svg>
            <span>Hapus</span>
          </button>
        </div>
      `;

      list.appendChild(li);

      if (isEditing) {
        const editInput = li.querySelector('.inline-edit-input');
        if (editInput) {
          editInput.focus();
          editInput.setSelectionRange(editInput.value.length, editInput.value.length);
        }
      }
    });
  }

  function render(enteringId = null) {
    renderStats();
    renderList(enteringId);
  }

  function resetAllFilters() {
    filterStatus = 'semua';
    filterCategory = 'Semua';
    filterPriority = 'semua';
    searchQuery = '';
    sortBy = 'terbaru';

    searchInput.value = '';
    btnClearSearch.hidden = true;
    priorityFilterSelect.value = 'semua';
    sortSelect.value = 'terbaru';

    statusTabs.querySelectorAll('.seg-tab').forEach((tab) => {
      const active = tab.dataset.status === 'semua';
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    categoryChips.querySelectorAll('.chip-btn').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.catFilter === 'Semua');
    });

    render();
  }

  // ===== POPOVER & MODAL HELPERS =====
  function setPopoverOpen(open) {
    btnUserMenu.setAttribute('aria-expanded', String(open));
    if (open) {
      userPopover.hidden = false;
      userPopover.classList.add('is-entering');
      requestAnimationFrame(() => {
        userPopover.classList.remove('is-entering');
      });
    } else {
      userPopover.hidden = true;
    }
  }

  function openShortcutsModal() {
    if (!shortcutsDialog.open) {
      shortcutsDialog.showModal();
    }
  }

  // ===== EVENTS =====
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) {
      input.setAttribute('aria-invalid', 'true');
      formError.textContent = 'Tuliskan isi tugas terlebih dahulu sebelum menekan Tambah.';
      formError.hidden = false;
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    formError.hidden = true;
    tambahTodo(val, selectedPriority, selectedCategory);
    input.value = '';
  });

  input.addEventListener('input', () => {
    if (input.value.trim()) {
      input.removeAttribute('aria-invalid');
      formError.hidden = true;
    }
  });

  priorityPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-pill');
    if (!btn) return;
    selectedPriority = btn.dataset.priority;
    priorityPicker.querySelectorAll('.option-pill').forEach((el) => {
      el.classList.toggle('is-active', el === btn);
    });
  });

  categoryPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-pill');
    if (!btn) return;
    selectedCategory = btn.dataset.category;
    categoryPicker.querySelectorAll('.option-pill').forEach((el) => {
      el.classList.toggle('is-active', el === btn);
    });
  });

  statusTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.seg-tab');
    if (!tab) return;
    filterStatus = tab.dataset.status;
    statusTabs.querySelectorAll('.seg-tab').forEach((el) => {
      const active = el === tab;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-selected', String(active));
    });
    render();
  });

  categoryChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-btn');
    if (!chip) return;
    filterCategory = chip.dataset.catFilter;
    categoryChips.querySelectorAll('.chip-btn').forEach((el) => {
      el.classList.toggle('is-active', el === chip);
    });
    render();
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    btnClearSearch.hidden = searchQuery.length === 0;
    render();
  });

  btnClearSearch.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    btnClearSearch.hidden = true;
    searchInput.focus();
    render();
  });

  priorityFilterSelect.addEventListener('change', () => {
    filterPriority = priorityFilterSelect.value;
    render();
  });

  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value;
    render();
  });

  btnClearCompleted.addEventListener('click', bersihkanSelesai);

  list.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.classList.contains('todo-checkbox')) {
      const visual = e.target.nextElementSibling;
      toggleSelesai(Number(e.target.dataset.id), visual);
    }
  });

  list.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.hapus');
    if (delBtn) {
      hapusTodo(Number(delBtn.dataset.id));
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    if (action === 'edit') {
      editingId = Number(actionBtn.dataset.id);
      render();
    } else if (action === 'cancel-edit') {
      editingId = null;
      render();
    } else if (action === 'seed-empty') {
      muatContoh();
    } else if (action === 'reset-filter') {
      resetAllFilters();
    }
  });

  list.addEventListener('submit', (e) => {
    const editForm = e.target.closest('.inline-edit-form');
    if (!editForm) return;
    e.preventDefault();
    const id = Number(editForm.dataset.id);
    const editInput = editForm.querySelector('.inline-edit-input');
    if (editInput) editTodo(id, editInput.value);
  });

  list.addEventListener('dblclick', (e) => {
    const teksEl = e.target.closest('.teks');
    if (!teksEl) return;
    const item = teksEl.closest('.todo-item');
    if (!item) return;
    editingId = Number(item.dataset.id);
    render();
  });

  list.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.classList.contains('inline-edit-input')) {
      editingId = null;
      render();
    }
  });

  // Hero & Popover & Toast & Shortcuts
  btnFocusComposer.addEventListener('click', () => {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  btnUserMenu.addEventListener('click', () => {
    const isOpen = btnUserMenu.getAttribute('aria-expanded') === 'true';
    setPopoverOpen(!isOpen);
  });

  btnSeedMenu.addEventListener('click', () => {
    setPopoverOpen(false);
    muatContoh();
  });

  btnExportJson.addEventListener('click', () => {
    setPopoverOpen(false);
    eksporJson();
  });

  btnToastUndo.addEventListener('click', urungkanHapus);
  btnToastClose.addEventListener('click', hideToast);

  toastEl.addEventListener('mouseenter', () => clearTimeout(toastTimer));
  toastEl.addEventListener('mouseleave', () => {
    if (toastEl.dataset.open === 'true') {
      toastTimer = setTimeout(hideToast, 2500);
    }
  });

  btnOpenShortcuts.addEventListener('click', openShortcutsModal);
  btnCloseShortcuts.addEventListener('click', () => shortcutsDialog.close());
  shortcutsDialog.addEventListener('click', (e) => {
    if (e.target === shortcutsDialog) shortcutsDialog.close();
  });

  btnBackToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('click', (e) => {
    if (!userPopover.hidden && !e.target.closest('.menu-wrap')) {
      setPopoverOpen(false);
    }
  });

  // Global keyboard shortcuts (instant, zero animation per design rules)
  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

    if (e.key === 'Escape') {
      if (!userPopover.hidden) setPopoverOpen(false);
      if (editingId !== null) {
        editingId = null;
        render();
      }
      return;
    }

    if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      input.focus();
    } else if (e.key === '/') {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === '?') {
      e.preventDefault();
      if (shortcutsDialog.open) shortcutsDialog.close();
      else openShortcutsModal();
    }
  });

  // ===== INTERACTIVE HALFTONE PARTICLE FOOTER (Adapted from PPL-MODUL3) =====
  function initHalftoneFooter(wordmark) {
    const root = document.getElementById('hwf-footer');
    const canvas = document.getElementById('hwf-canvas');
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;

    const o = {
      wordmark,
      dotGap: 6,
      radius: 85,
      crop: 0.2,
      grain: 0.5,
      fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif',
      fontWeight: 800,
      bg: '#0C0806',
      inkHex: '#F7EFE6',
      ink: [247, 239, 230],
      warm: [243, 220, 141],
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let px = -1e5;
    let py = -1e5;
    let raf = 0;
    let visible = true;
    let awake = true;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0);
    let count = 0;
    let grainTile = null;

    const layout = () => {
      const rect = root.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const mask = document.createElement('canvas');
      mask.width = w;
      mask.height = h;
      const m = mask.getContext('2d', { willReadFrequently: true });
      if (!m) return;

      m.font = `${o.fontWeight} 100px ${o.fontFamily}`;
      const measured = m.measureText(o.wordmark).width;
      const fit = measured > 0 ? ((w * 0.96) / measured) * 100 : 0;
      m.font = `${o.fontWeight} ${fit}px ${o.fontFamily}`;
      const box = m.measureText(o.wordmark);
      const cap = box.actualBoundingBoxAscent || fit * 0.72;
      m.fillStyle = '#000';
      m.textBaseline = 'alphabetic';
      m.fillText(o.wordmark, (w - box.width) / 2, h + cap * o.crop);
      const img = m.getImageData(0, 0, w, h).data;

      const gap = o.dotGap;
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, Math.sqrt(Math.min(1, cov)) * gap * 0.56);
        }
      }
      dots = new Float32Array(tmp);
      count = tmp.length / 7;

      grainTile = document.createElement('canvas');
      grainTile.width = 256;
      grainTile.height = 256;
      const g = grainTile.getContext('2d');
      if (g) {
        const id = g.createImageData(256, 256);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
        }
        g.putImageData(id, 0, 0);
      }
      awake = true;
    };

    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = o.bg;
      ctx.fillRect(0, 0, w, h);

      const r = reduced ? 0 : o.radius;
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.9;
      let moving = false;

      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j];
        let y = dots[j + 1];
        let vx = dots[j + 2];
        let vy = dots[j + 3];
        const hx = dots[j + 4];
        const hy = dots[j + 5];

        if (!reduced) {
          if (ringAge < 900) {
            const dx = hx - ring.x;
            const dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
            if (band > 0) {
              const f = band * 3.2 * (1 - ringAge / 900);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (r > 0 && d2 < r * r) {
            const d = Math.sqrt(d2) + 0.001;
            const f = (1 - d / r) * 2.6;
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
          vx = (vx + (hx - x) * 0.05) * 0.84;
          vy = (vy + (hy - y) * 0.05) * 0.84;
          x += vx;
          y += vy;
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) {
            moving = true;
          } else {
            x = hx;
            y = hy;
            vx = 0;
            vy = 0;
          }
          dots[j] = x;
          dots[j + 1] = y;
          dots[j + 2] = vx;
          dots[j + 3] = vy;
        }

        const k = Math.min(1, Math.hypot(x - hx, y - hy) / 28);
        ctx.fillStyle =
          k > 0.02
            ? `rgb(${Math.round(o.ink[0] + (o.warm[0] - o.ink[0]) * k)},${Math.round(o.ink[1] + (o.warm[1] - o.ink[1]) * k)},${Math.round(o.ink[2] + (o.warm[2] - o.ink[2]) * k)})`
            : o.inkHex;
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6], 0, 6.2832);
        ctx.fill();
      }

      if (grainTile && o.grain > 0) {
        ctx.globalAlpha = o.grain * 0.08;
        ctx.globalCompositeOperation = 'overlay';
        const pattern = ctx.createPattern(grainTile, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      awake = moving || ringAge < 900 || px > -1e4;
    };

    const loop = (now) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (awake) raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      awake = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    root.addEventListener('pointermove', (e) => {
      const b = canvas.getBoundingClientRect();
      px = e.clientX - b.left;
      py = e.clientY - b.top;
      wake();
    });
    root.addEventListener('pointerleave', () => {
      px = -1e5;
      py = -1e5;
      wake();
    });
    root.addEventListener('pointerdown', (e) => {
      if (reduced || e.target.closest('a,button')) return;
      const b = canvas.getBoundingClientRect();
      ring = { x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() };
      wake();
    });

    layout();
    draw(performance.now());
    wake();
    new ResizeObserver(() => {
      layout();
      wake();
    }).observe(root);
    new IntersectionObserver((entries) => {
      visible = entries[0] ? entries[0].isIntersecting : true;
      if (visible) wake();
    }).observe(root);
    document.fonts?.ready?.then(() => {
      layout();
      wake();
    });
  }

  // ===== INIT =====
  render();
  initHalftoneFooter('todolist');
})();
