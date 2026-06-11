/* ============================================================
   BAMBI — script.js
   Full interactivity: preloader, parallax, forms, calendar,
   LocalStorage, toasts, dark mode, meetings table
   ============================================================ */

'use strict';

/* ===================== HELPERS ===================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const LS = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function formatDate(iso) {
  const [y,m,d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/* ===================== PRELOADER ===================== */
window.addEventListener('load', () => {
  setTimeout(() => {
    $('#preloader').classList.add('hidden');
    document.body.style.overflow = '';
  }, 2200);
});
document.body.style.overflow = 'hidden';

/* ===================== NAVBAR ===================== */
const navbar = $('#navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ===================== BURGER MENU ===================== */
const burger = $('#burger');
const mobileMenu = $('#mobileMenu');
let menuOpen = false;

burger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.classList.toggle('open', menuOpen);
  document.body.style.overflow = menuOpen ? 'hidden' : '';
});

$$('.mm-link').forEach(a => {
  a.addEventListener('click', () => {
    menuOpen = false;
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

/* ===================== THEME TOGGLE ===================== */
const themeToggle = $('#themeToggle');
const themeIcon = $('#themeIcon');
let isDark = LS.get('bambi-theme') === 'dark';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
  LS.set('bambi-theme', dark ? 'dark' : 'light');
}

applyTheme(isDark);

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  applyTheme(isDark);
});

/* ===================== PARALLAX HERO ===================== */
const heroBg = $('#heroBg');
window.addEventListener('scroll', () => {
  if (window.scrollY < window.innerHeight) {
    heroBg.style.transform = `translateY(${window.scrollY * 0.4}px)`;
  }
}, { passive: true });

/* ===================== SCROLL REVEAL ===================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const delay = e.target.dataset.delay || 0;
      setTimeout(() => {
        e.target.classList.add('revealed', 'visible');
      }, +delay);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

$$('[data-reveal], .about-card').forEach(el => revealObserver.observe(el));

/* ===================== TOAST ===================== */
function showToast(msg, type = 'info', duration = 4000) {
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icons[type]} toast-icon"></i><div class="toast-text">${msg}</div>`;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ===================== CALENDAR DATA ===================== */
// Pre-seeded busy dates (next few months)
const today = new Date();
const busyDates = new Set();
const meetings = LS.get('bambi-meetings') || [];

// Build busy set from meetings
function rebuildBusy() {
  busyDates.clear();
  meetings.forEach(m => busyDates.add(m.date));
}

// Add some default busy dates for demo
function seedBusy() {
  const y = today.getFullYear();
  const m = today.getMonth();
  const seeds = [3,7,12,15,18,22,25,28];
  seeds.forEach(d => {
    const dt = new Date(y, m, d);
    if (dt > today) busyDates.add(dateKey(y, m, d));
  });
  // next month too
  const m2 = m + 1;
  [2,5,9,14,20,23].forEach(d => {
    busyDates.add(dateKey(y, m2, d));
  });
}

rebuildBusy();
seedBusy();

/* ===================== CALENDAR BUILDER ===================== */
function buildCalendar(containerId, state, onSelect) {
  const container = $(`#${containerId}`);
  if (!container) return;

  const { year, month } = state;
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  container.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav cal-prev-${containerId}"><i class="fas fa-chevron-left"></i></button>
      <div class="cal-month-year">${monthNames[month]} ${year}</div>
      <button class="cal-nav cal-next-${containerId}"><i class="fas fa-chevron-right"></i></button>
    </div>
    <div class="cal-weekdays">
      <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
    </div>
    <div class="cal-days" id="days-${containerId}"></div>
  `;

  const daysEl = $(`#days-${containerId}`);

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    daysEl.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    const isPast = key < todayStr;
    const isBusy = busyDates.has(key);
    const isToday = key === todayStr;
    const isSelected = state.selected === key;

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    else if (isBusy) cls += ' busy';
    else cls += ' free';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';

    const el = document.createElement('div');
    el.className = cls;
    el.textContent = d;
    el.dataset.key = key;
    el.dataset.day = d;

    if (!isPast && !isBusy) {
      el.addEventListener('click', () => {
        // Deselect all
        $$('.cal-day.selected', container).forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        state.selected = key;
        if (onSelect) onSelect(key);
      });
    } else if (isBusy && !isPast) {
      el.title = 'Эта дата уже занята';
      el.addEventListener('click', () => {
        showToast('Эта дата уже занята 😔', 'error');
      });
    }

    daysEl.appendChild(el);
  }

  // Nav
  $(`.cal-prev-${containerId}`, container).addEventListener('click', () => {
    state.month--;
    if (state.month < 0) { state.month = 11; state.year--; }
    buildCalendar(containerId, state, onSelect);
  });
  $(`.cal-next-${containerId}`, container).addEventListener('click', () => {
    state.month++;
    if (state.month > 11) { state.month = 0; state.year++; }
    buildCalendar(containerId, state, onSelect);
  });
}

/* ===================== TIME SLOTS ===================== */
const timeOptions = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function renderTimeSlots(containerId, wrapId, selectedDateKey) {
  const wrap = $(`#${wrapId}`);
  const slotsEl = $(`#${containerId}`);
  if (!wrap || !slotsEl) return;

  if (!selectedDateKey) { wrap.style.display = 'none'; return; }

  // Find taken times for that date
  const takenTimes = meetings.filter(m => m.date === selectedDateKey).map(m => m.time);

  slotsEl.innerHTML = '';
  wrap.style.display = 'block';

  timeOptions.forEach(t => {
    const btn = document.createElement('div');
    btn.className = 'time-slot' + (takenTimes.includes(t) ? ' selected' : '');
    btn.textContent = t;
    btn.dataset.time = t;
    if (!takenTimes.includes(t)) {
      btn.addEventListener('click', () => {
        $$('.time-slot', slotsEl).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    } else {
      btn.style.opacity = '.35';
      btn.style.cursor = 'not-allowed';
      btn.title = 'Время занято';
    }
    slotsEl.appendChild(btn);
  });
}

/* ===================== INIT FORM CALENDARS ===================== */
const calStates = {
  bf: { year: today.getFullYear(), month: today.getMonth(), selected: null },
  fm: { year: today.getFullYear(), month: today.getMonth(), selected: null },
  ff: { year: today.getFullYear(), month: today.getMonth(), selected: null },
};

buildCalendar('inlineCalBf', calStates.bf, (key) => renderTimeSlots('timeSlotsBf', 'timeBfWrap', key));
buildCalendar('inlineCalFm', calStates.fm, (key) => renderTimeSlots('timeSlotsFm', 'timeFmWrap', key));
buildCalendar('inlineCalFf', calStates.ff, (key) => renderTimeSlots('timeSlotsFf', 'timeFfWrap', key));

/* ===================== MAIN CALENDAR ===================== */
const mainCalState = { year: today.getFullYear(), month: today.getMonth(), selected: null };

function buildMainCalendar() {
  const container = $('#calDays');
  if (!container) return;

  const { year, month } = mainCalState;
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  $('#calMonthYear').textContent = `${monthNames[month]} ${year}`;
  container.innerHTML = '';

  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    container.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(year, month, d);
    const isPast = key < todayStr;
    const isBusy = busyDates.has(key);
    const isToday = key === todayStr;

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    else if (isBusy) cls += ' busy';
    else cls += ' free';
    if (isToday) cls += ' today';

    const el = document.createElement('div');
    el.className = cls;
    el.textContent = d;

    el.addEventListener('click', () => {
      if (isPast) return;
      showCalModal(key, isBusy);
    });

    container.appendChild(el);
  }
}

$('#calPrev').addEventListener('click', () => {
  mainCalState.month--;
  if (mainCalState.month < 0) { mainCalState.month = 11; mainCalState.year--; }
  buildMainCalendar();
});

$('#calNext').addEventListener('click', () => {
  mainCalState.month++;
  if (mainCalState.month > 11) { mainCalState.month = 0; mainCalState.year++; }
  buildMainCalendar();
});

function showCalModal(dateStr, isBusy) {
  const modal = $('#calModal');
  const dateEl = $('#calModalDate');
  const statusEl = $('#calModalStatus');

  dateEl.textContent = formatDate(dateStr);

  if (isBusy) {
    statusEl.textContent = '❌ Эта дата уже занята';
    statusEl.className = 'cal-modal-status busy';
  } else {
    statusEl.innerHTML = '✅ Свободно! <a href="#booking" style="color:var(--accent);text-decoration:underline;margin-left:.5rem">Забронировать →</a>';
    statusEl.className = 'cal-modal-status free';
  }

  modal.classList.add('open');
}

$('#calModalClose').addEventListener('click', () => $('#calModal').classList.remove('open'));
$('#calModal').addEventListener('click', (e) => { if (e.target === $('#calModal')) $('#calModal').classList.remove('open'); });

buildMainCalendar();

/* ===================== BOOKING TYPE SELECT ===================== */
let activeType = null;

$$('.type-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.type-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    activeType = card.dataset.type;

    $$('.booking-form').forEach(f => f.classList.remove('active'));

    const formMap = { boyfriend: 'formBoyfriend', 'friend-m': 'formFriendM', 'friend-f': 'formFriendF' };
    const form = $(`#${formMap[activeType]}`);
    if (form) {
      form.classList.add('active');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ===================== TAG BUTTONS ===================== */
$$('.tags-select').forEach(container => {
  const hiddenId = container.id.replace('tags', 'format');
  const hidden = $(`#${hiddenId}`);
  const selected = [];

  $$('.tag-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      const val = btn.dataset.val;
      const idx = selected.indexOf(val);
      if (idx === -1) selected.push(val);
      else selected.splice(idx, 1);
      if (hidden) hidden.value = selected.join(',');
    });
  });
});

/* ===================== FILE UPLOAD PREVIEW ===================== */
$('#photoBf')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    $('#previewBf').innerHTML = `<img src="${ev.target.result}" alt="Preview" />`;
  };
  reader.readAsDataURL(file);
});

/* ===================== FORM VALIDATION ===================== */
function validateForm(form) {
  let valid = true;
  $$('[required]', form).forEach(field => {
    field.classList.remove('error');
    if (!field.value.trim()) {
      field.classList.add('error');
      valid = false;
    }
  });
  return valid;
}

/* ===================== FORM SUBMIT ===================== */
function handleFormSubmit(formEl, type, calState, timeSlotsId) {
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm(formEl)) {
      showToast('Пожалуйста, заполни все обязательные поля ✨', 'error');
      const firstError = $('.error', formEl);
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!calState.selected) {
      showToast('Выбери дату встречи 📅', 'error');
      return;
    }

    const selectedTime = $('.time-slot.selected', $(`#${timeSlotsId}`)?.closest('.time-select-wrap') || formEl);
    const timeVal = selectedTime ? selectedTime.dataset.time : '';
    if (!timeVal) {
      showToast('Выбери время встречи ⏰', 'error');
      return;
    }

    // Check if date/time already taken
    const conflict = meetings.find(m => m.date === calState.selected && m.time === timeVal);
    if (conflict) {
      showToast('Это время уже занято. Выбери другое ⏰', 'error');
      return;
    }

    const data = Object.fromEntries(new FormData(formEl));
    const typeLabels = { boyfriend: 'Парень', 'friend-m': 'Друг', 'friend-f': 'Подруга' };
    const typeEmojis = { boyfriend: '❤️', 'friend-m': '🤝', 'friend-f': '🌸' };

    const record = {
      id: Date.now(),
      name: data.name || 'Аноним',
      type,
      typeLabel: typeLabels[type],
      typeEmoji: typeEmojis[type],
      date: calState.selected,
      time: timeVal,
      city: data.city || '',
      data,
      createdAt: new Date().toISOString(),
    };

    meetings.push(record);
    LS.set('bambi-meetings', meetings);
    rebuildBusy();

    // Reset form
    formEl.reset();
    $$('.tag-btn', formEl).forEach(b => b.classList.remove('selected'));
    $$('.time-slot', formEl).forEach(b => b.classList.remove('selected'));
    calState.selected = null;

    // Rebuild calendars
    buildCalendar('inlineCalBf', calStates.bf, (key) => renderTimeSlots('timeSlotsBf', 'timeBfWrap', key));
    buildCalendar('inlineCalFm', calStates.fm, (key) => renderTimeSlots('timeSlotsFm', 'timeFmWrap', key));
    buildCalendar('inlineCalFf', calStates.ff, (key) => renderTimeSlots('timeSlotsFf', 'timeFfWrap', key));
    buildMainCalendar();

    // Deactivate forms
    $$('.type-card').forEach(c => c.classList.remove('active'));
    $$('.booking-form').forEach(f => f.classList.remove('active'));
    activeType = null;

    renderMeetings();

    showToast(`Заявка отправлена! Увидимся ${formatDate(record.date)} в ${record.time} 🎉`, 'success', 6000);

    // Scroll to meetings
    setTimeout(() => {
      $('#meetings')?.scrollIntoView({ behavior: 'smooth' });
    }, 800);
  });
}

handleFormSubmit($('#formBoyfriend'), 'boyfriend', calStates.bf, 'timeSlotsBf');
handleFormSubmit($('#formFriendM'), 'friend-m', calStates.fm, 'timeSlotsFm');
handleFormSubmit($('#formFriendF'), 'friend-f', calStates.ff, 'timeSlotsFf');

/* ===================== MEETINGS TABLE ===================== */
let searchQuery = '';
let sortMode = 'date-asc';

function renderMeetings() {
  const body = $('#meetingsBody');
  const empty = $('#meetingsEmpty');
  if (!body) return;

  let list = [...meetings];

  if (searchQuery) {
    list = list.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  list.sort((a, b) => {
    if (sortMode === 'date-asc')  return a.date.localeCompare(b.date);
    if (sortMode === 'date-desc') return b.date.localeCompare(a.date);
    if (sortMode === 'name')      return a.name.localeCompare(b.name);
    if (sortMode === 'type')      return a.typeLabel.localeCompare(b.typeLabel);
    return 0;
  });

  body.innerHTML = '';

  if (list.length === 0) {
    empty.classList.add('show');
    return;
  }

  empty.classList.remove('show');

  list.forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td><span class="meeting-type-badge badge-${m.type}">${m.typeEmoji} ${m.typeLabel}</span></td>
      <td>${formatDate(m.date)}</td>
      <td>${m.time}</td>
      <td>${escapeHtml(m.city)}</td>
      <td>
        <button class="btn-delete" data-id="${m.id}" title="Удалить">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    body.appendChild(tr);
  });

  $$('.btn-delete', body).forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +btn.dataset.id;
      const idx = meetings.findIndex(m => m.id === id);
      if (idx !== -1) {
        const name = meetings[idx].name;
        meetings.splice(idx, 1);
        LS.set('bambi-meetings', meetings);
        rebuildBusy();
        buildMainCalendar();
        renderMeetings();
        showToast(`Встреча с ${name} удалена`, 'info');
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

$('#meetingsSearch')?.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderMeetings();
});

$('#meetingsSort')?.addEventListener('change', (e) => {
  sortMode = e.target.value;
  renderMeetings();
});

renderMeetings();

// Seed demo meetings if empty
if (meetings.length === 0) {
  const demoMeetings = [
    { id: 1, name: 'Алексей', type: 'boyfriend', typeLabel: 'Парень', typeEmoji: '❤️', date: '2026-07-15', time: '18:00', city: 'Москва', data: {}, createdAt: new Date().toISOString() },
    { id: 2, name: 'Мария', type: 'friend-f', typeLabel: 'Подруга', typeEmoji: '🌸', date: '2026-07-22', time: '14:00', city: 'Алматы', data: {}, createdAt: new Date().toISOString() },
    { id: 3, name: 'Дмитрий', type: 'friend-m', typeLabel: 'Друг', typeEmoji: '🤝', date: '2026-07-30', time: '17:00', city: 'Астана', data: {}, createdAt: new Date().toISOString() },
  ];
  demoMeetings.forEach(m => { meetings.push(m); busyDates.add(m.date); });
  LS.set('bambi-meetings', meetings);
  rebuildBusy();
  buildMainCalendar();
  renderMeetings();
}

/* ===================== GALLERY REVEAL ===================== */
const galleryObserver = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.style.opacity = '1', i * 80);
      galleryObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.05 });

$$('.gallery-item').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transition = `opacity .7s ease ${i * 0.07}s`;
  galleryObserver.observe(el);
});

/* ===================== ACTIVE NAV LINK ===================== */
const sections = $$('section[id]');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      $$('.nav-links a').forEach(a => a.classList.remove('active'));
      const link = $(`.nav-links a[href="#${e.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { threshold: 0.5 });

sections.forEach(s => navObserver.observe(s));

/* ===================== INPUT CLEAR ERRORS ===================== */
$$(  'input, textarea').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('error'));
});

/* ===================== KEYBOARD CLOSE MODAL ===================== */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $('#calModal')?.classList.remove('open');
    if (menuOpen) {
      menuOpen = false;
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
});

console.log('%c BAMBI ✈️ ', 'background:#c9a87c;color:#fff;font-size:18px;padding:8px 16px;border-radius:8px;');
console.log('%c Travel & Meet — 2026 ', 'color:#b8935a;font-size:12px;');
