// ===== Backend API base path =====
// الهيكلية: mokhayam-alsaqr-project/dashboard/ (هون) + mokhayam-alsaqr-project/backend/api/
// فمن أي صفحة داخل dashboard/, لازم نطلع مجلد وننزل عبackend/api.
const API_BASE = '../backend/api';

// ===== Shared: export any table to an Excel file =====
function exportTableToExcel(tableSelector, filename){
  if (typeof XLSX === 'undefined') {
    alert('مكتبة التصدير لسا ما تحمّلت (تأكد من الاتصال بالإنترنت) — جرب مرة ثانية.');
    return;
  }
  const table = document.querySelector(tableSelector);
  if (!table) return;
  const wb = XLSX.utils.table_to_book(table, { sheet: 'Sheet1' });
  XLSX.writeFile(wb, filename);
}

// ===== Shared: color maps for aid-type / category accents =====
const colorVarMap = {
  gold: 'var(--gold-deep)', copper: 'var(--copper)', teal: 'var(--teal)',
  slate: 'var(--slate)', burgundy: 'var(--burgundy)',
};
const colorBgMap = {
  gold: 'var(--gold-pale)', copper: 'rgba(181,101,45,0.14)', teal: 'rgba(47,111,107,0.14)',
  slate: 'rgba(70,88,107,0.14)', burgundy: 'rgba(140,58,58,0.12)',
};

// ===== Zones page (الموقع الجغرافي): load, add, delete =====
const zonesGrid = document.getElementById('zonesGrid');

async function loadZones(){
  if (!zonesGrid) return;
  try {
    const res = await fetch(`${API_BASE}/zones.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    if (res.status === 403) { window.location.href = 'dashboard.html'; return; }
    const data = await res.json();
    const zones = data.zones || [];

    const countLabel = document.getElementById('zonesCountLabel');
    if (countLabel) countLabel.textContent = `${zones.length} مربع/منطقة معرّفة`;

    if (zones.length === 0) {
      zonesGrid.innerHTML = '<p style="color:var(--stone); text-align:center; padding:30px; grid-column:1/-1;">ما في مربعات معرّفة بعد. دوس "إضافة مربع/منطقة" لتبدأ.</p>';
      return;
    }

    zonesGrid.innerHTML = zones.map(z => {
      const accent = colorVarMap[z.color] || 'var(--gold-deep)';
      const bg = colorBgMap[z.color] || 'var(--gold-pale)';
      return `
      <div class="cat-card" style="cursor:default;">
        <div class="cat-icon" style="background:${bg};">
          <svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="cat-info"><h3>${z.name}</h3><span>${z.families_count} عائلة</span></div>
        <button class="cat-delete-btn delete-zone-btn admin-only" data-id="${z.id}" data-name="${z.name}" title="حذف">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>`;
    }).join('');

    zonesGrid.querySelectorAll('.delete-zone-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm(`متأكد إنك بدك تحذف "${this.dataset.name}"؟ العائلات المرتبطة فيها بتصير بدون مربع محدد، مش بتنحذف.`)) return;
        try {
          const res = await fetch(`${API_BASE}/zones.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) loadZones();
          else alert('تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    zonesGrid.innerHTML = '<p style="color:var(--burgundy); text-align:center; padding:30px; grid-column:1/-1;">تعذّر تحميل المربعات — تأكد إنه الباك اند شغّال.</p>';
  }
}
loadZones();

const addZoneForm = document.getElementById('addZoneForm');
if (addZoneForm) {
  let selectedZoneColor = 'gold';
  document.querySelectorAll('#addZoneForm .color-swatch').forEach(sw => {
    sw.addEventListener('click', function(){
      document.querySelectorAll('#addZoneForm .color-swatch').forEach(s => s.classList.remove('selected'));
      this.classList.add('selected');
      selectedZoneColor = this.dataset.color;
    });
  });

  addZoneForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addZoneNote');
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/zones.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('zoneName').value.trim(),
          color: selectedZoneColor,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ المربع';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = 'تمت إضافة المربع بنجاح.';
      loadZones();
      setTimeout(() => { closeModal('addZoneModal'); addZoneForm.reset(); note.textContent = ''; }, 1400);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Categories page: load real categories, add, delete =====
const categoriesGrid = document.getElementById('categoriesGrid');

async function loadCategories(){
  if (!categoriesGrid) return;
  try {
    const res = await fetch(`${API_BASE}/categories_stats.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const cats = data.categories || [];

    const countLabel = document.getElementById('categoriesCountLabel');
    if (countLabel) countLabel.textContent = `${cats.length} فئة معرّفة`;

    if (cats.length === 0) {
      categoriesGrid.innerHTML = '<p style="color:var(--stone); text-align:center; padding:30px; grid-column:1/-1;">ما في فئات خاصة معرّفة بعد. دوس "إضافة فئة" لتبدأ.</p>';
      return;
    }

    categoriesGrid.innerHTML = cats.map(c => {
      const accent = colorVarMap[c.color] || 'var(--gold-deep)';
      const bg = colorBgMap[c.color] || 'var(--gold-pale)';
      return `
      <div class="cat-card" style="cursor:default;">
        <div class="cat-icon" style="background:${bg};">
          <svg viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2"><path d="M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div class="cat-info"><h3>${c.name}</h3><span>${c.total} سجل</span></div>
        <button class="cat-delete-btn delete-category-btn" data-id="${c.id}" data-name="${c.name}" title="حذف">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>`;
    }).join('');

    categoriesGrid.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm(`متأكد إنك بدك تحذف فئة "${this.dataset.name}"؟ الأفراد المرتبطين فيها بيصيروا بدون فئة، مش بينحذفوا.`)) return;
        try {
          const res = await fetch(`${API_BASE}/special_categories.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) loadCategories();
          else alert('تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    categoriesGrid.innerHTML = '<p style="color:var(--burgundy); text-align:center; padding:30px; grid-column:1/-1;">تعذّر تحميل الفئات — تأكد إنه الباك اند شغّال.</p>';
  }
}
loadCategories();

const addCategoryForm = document.getElementById('addCategoryForm');
if (addCategoryForm) {
  let selectedCategoryColor = 'gold';
  document.querySelectorAll('#addCategoryForm .color-swatch').forEach(sw => {
    sw.addEventListener('click', function(){
      document.querySelectorAll('#addCategoryForm .color-swatch').forEach(s => s.classList.remove('selected'));
      this.classList.add('selected');
      selectedCategoryColor = this.dataset.color;
    });
  });

  addCategoryForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addCategoryNote');
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/special_categories.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('categoryName').value.trim(),
          color: selectedCategoryColor,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ الفئة';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = 'تمت إضافة الفئة بنجاح.';
      loadCategories();
      setTimeout(() => { closeModal('addCategoryModal'); addCategoryForm.reset(); note.textContent = ''; }, 1400);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}
// ===== Role-based access control (runs on every dashboard-shell page) =====
const sbNavEl = document.querySelector('.sb-nav');
if (sbNavEl) {
  const fileToPageKey = {
    'dashboard.html': 'dashboard', 'families.html': 'families',
    'join-requests.html': 'join-requests', 'scan-distribution.html': 'scan-distribution',
    'individuals.html': 'individuals', 'categories.html': 'categories',
    'aid-log.html': 'aid-log', 'aid-types.html': 'aid-types',
    'users.html': 'users', 'settings.html': 'settings', 'complaints.html': 'complaints',
    'zones.html': 'zones',
  };
  const currentFile = location.pathname.split('/').pop() || 'dashboard.html';
  const currentPageKey = fileToPageKey[currentFile] || 'dashboard';

  (async function enforceRoleAccess(){
    try {
      const res = await fetch(`${API_BASE}/me.php`, { credentials: 'include' });
      if (res.status === 401) { window.location.href = 'index.html'; return; }
      const data = await res.json();
      const user = data.user;
      const allowedPages = data.allowed_pages; // null = مدير (كل شي مسموح)

      const nameEl = document.getElementById('sbUserName');
      const roleEl = document.getElementById('sbUserRole');
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role;

      if (allowedPages === null) return; // مدير — ما في قيود

      document.body.classList.add('role-data-entry');

      // صفحات "المستخدمون" و"الإعدادات" دايمًا للمدير بس، بغض النظر عن الإعدادات
      const alwaysAdminOnly = ['users', 'settings'];
      if (alwaysAdminOnly.includes(currentPageKey)) {
        window.location.href = 'dashboard.html';
        return;
      }

      // اخفِ روابط الصفحات غير المسموحة بالقائمة الجانبية
      document.querySelectorAll('.sb-nav li').forEach(li => {
        const link = li.querySelector('a[data-page]');
        if (!link) return;
        const key = link.dataset.page;
        if (alwaysAdminOnly.includes(key)) return; // مخفية أصلًا بـ CSS (.admin-only)
        if (!allowedPages.includes(key)) li.classList.add('page-hidden');
      });

      // لو الصفحة الحالية نفسها مو مسموحة، رجّعه لأول صفحة مسموحة إله
      if (!allowedPages.includes(currentPageKey)) {
        const fallback = allowedPages[0] || 'dashboard';
        const fallbackFile = Object.keys(fileToPageKey).find(f => fileToPageKey[f] === fallback) || 'dashboard.html';
        alert('غير مصرح لك بالوصول لهذا القسم.');
        window.location.href = fallbackFile;
      }
    } catch (err) {
      console.error('تعذّر التحقق من الصلاحيات', err);
    }
  })();
}

// ===== Complaints page: load, mark reviewed, delete =====
const complaintsList = document.getElementById('complaintsList');
async function loadComplaints(){
  if (!complaintsList) return;
  try {
    const res = await fetch(`${API_BASE}/complaints.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    if (res.status === 403) { window.location.href = 'dashboard.html'; return; }
    const data = await res.json();
    const complaints = data.complaints || [];

    const countLabel = document.getElementById('complaintsCountLabel');
    const newCount = complaints.filter(c => c.status === 'جديدة').length;
    if (countLabel) countLabel.textContent = `${complaints.length} شكوى (${newCount} جديدة)`;

    if (complaints.length === 0) {
      complaintsList.innerHTML = '<p style="color:var(--stone); text-align:center; padding:30px;">ما في شكاوى بعد.</p>';
      return;
    }

    complaintsList.innerHTML = complaints.map(c => `
      <div class="request-card" style="margin-bottom:16px; max-width:100%;">
        <div class="request-head">
          <div class="request-id" style="color:${c.status === 'جديدة' ? 'var(--burgundy)' : 'var(--teal)'};">
            ${c.status === 'جديدة' ? '🔴 جديدة' : '✅ تمت المراجعة'} — ${c.type}
          </div>
          <span class="request-date">${c.created_at}</span>
        </div>
        <div class="request-body">
          <div class="request-row"><span>الاسم</span><b>${c.name}</b></div>
          <div class="request-row"><span>رقم الهاتف</span><b>${c.phone}</b></div>
          <div class="request-row"><span>التفاصيل</span><b style="text-align:right; max-width:60%;">${c.message}</b></div>
        </div>
        <div class="request-actions">
          ${c.status === 'جديدة' ? `<button class="tbtn tbtn-accept tbtn-lg mark-reviewed-btn" data-id="${c.id}">تمت المراجعة</button>` : ''}
          <button class="tbtn tbtn-danger tbtn-lg admin-only delete-complaint-btn" data-id="${c.id}">حذف</button>
        </div>
      </div>
    `).join('');

    complaintsList.querySelectorAll('.mark-reviewed-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        try {
          const res = await fetch(`${API_BASE}/complaints.php`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(this.dataset.id) }),
          });
          if (res.ok) loadComplaints();
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });

    complaintsList.querySelectorAll('.delete-complaint-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm('متأكد إنك بدك تحذف هالشكوى؟')) return;
        try {
          const res = await fetch(`${API_BASE}/complaints.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) loadComplaints();
          else alert('تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    complaintsList.innerHTML = '<p style="color:var(--burgundy); text-align:center; padding:30px;">تعذّر تحميل الشكاوى.</p>';
  }
}
loadComplaints();

const deleteAllComplaintsBtn = document.getElementById('deleteAllComplaintsBtn');
if (deleteAllComplaintsBtn) {
  deleteAllComplaintsBtn.addEventListener('click', async function(){
    if (!confirm('متأكد إنك بدك تحذف كل الشكاوى نهائيًا؟')) return;
    try {
      const res = await fetch(`${API_BASE}/complaints.php?all=1`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) loadComplaints();
      else alert('تعذّر الحذف.');
    } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
  });
}

// ===== Users page (admin only): list, add, delete =====
const usersTableBody = document.getElementById('usersTableBody');
async function loadUsers(){
  if (!usersTableBody) return;
  try {
    const res = await fetch(`${API_BASE}/users.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    if (res.status === 403) { window.location.href = 'dashboard.html'; return; }
    const data = await res.json();
    const users = data.users || [];

    const countLabel = document.getElementById('usersCountLabel');
    if (countLabel) countLabel.textContent = `${users.length} مستخدم`;

    usersTableBody.innerHTML = users.map(u => `
      <tr>
        <td class="name-cell">${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${formatDate(u.created_at.slice(0,10))}</td>
        <td><button class="icn-btn delete-user-btn" data-id="${u.id}" data-name="${u.name}" title="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button></td>
      </tr>
    `).join('');

    usersTableBody.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm(`متأكد إنك بدك تحذف المستخدم "${this.dataset.name}"؟`)) return;
        try {
          const res = await fetch(`${API_BASE}/users.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          const data = await res.json();
          if (res.ok) loadUsers();
          else alert(data.error || 'تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--burgundy); padding:24px;">تعذّر تحميل المستخدمين.</td></tr>';
  }
}
loadUsers();

const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
  addUserForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addUserNote');
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/users.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('newUserName').value.trim(),
          email: document.getElementById('newUserEmail').value.trim(),
          password: document.getElementById('newUserPassword').value,
          role: document.getElementById('newUserRole').value,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ المستخدم';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = 'تمت إضافة المستخدم بنجاح.';
      loadUsers();
      setTimeout(() => { closeModal('addUserModal'); addUserForm.reset(); note.textContent = ''; }, 1400);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Settings page (admin only): configure data-entry allowed pages =====
const permissionsForm = document.getElementById('permissionsForm');
if (permissionsForm) {
  (async function loadPermissions(){
    try {
      const res = await fetch(`${API_BASE}/settings.php`, { credentials: 'include' });
      if (res.status === 401) { window.location.href = 'index.html'; return; }
      if (res.status === 403) { window.location.href = 'dashboard.html'; return; }
      const data = await res.json();
      const allowed = data.allowed_pages || [];
      permissionsForm.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = allowed.includes(cb.value);
      });
    } catch (err) { /* يبقى كل شي غير محدد */ }
  })();

  document.getElementById('savePermissionsBtn').addEventListener('click', async function(){
    const note = document.getElementById('permissionsNote');
    const checked = [...permissionsForm.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);

    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    try {
      const res = await fetch(`${API_BASE}/settings.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_pages: checked }),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر الحفظ';
        return;
      }
      note.style.color = 'var(--teal)';
      note.textContent = 'تم حفظ الإعدادات بنجاح.';
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Shared: live age calculation for disabled age fields next to birthdate inputs =====
function computeAgeFromDate(dateStr){
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  if (isNaN(birth)) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} سنة` : '';
}
function wireAgeField(birthdateId, ageId){
  const birthEl = document.getElementById(birthdateId);
  const ageEl = document.getElementById(ageId);
  if (!birthEl || !ageEl) return;
  birthEl.addEventListener('change', () => { ageEl.value = computeAgeFromDate(birthEl.value); });
}
wireAgeField('famHeadBirthdate', 'famHeadAge');
wireAgeField('indBirthdate', 'indAge');

// ===== Theme toggle (light/dark) =====
function toggleTheme(){
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}
document.querySelectorAll('#themeToggle, #themeToggle2').forEach(btn => {
  btn.addEventListener('click', toggleTheme);
});

// ===== Login page: real API call =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API_BASE}/login.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'تعذّر تسجيل الدخول';
        return;
      }
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = 'تعذّر الاتصال بالسيرفر. تأكد إنه الباك اند شغّال.';
    }
  });
}

// ===== Logout: destroy server session then go to login =====
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function(){
    fetch(`${API_BASE}/logout.php`, { method: 'POST', credentials: 'include' })
      .finally(() => { window.location.href = 'index.html'; });
  });
}
// The sidebar logout is now a real <a href="index.html">; this also clears the session in the background.
document.querySelectorAll('.sb-logout').forEach(link => {
  link.addEventListener('click', function(){
    fetch(`${API_BASE}/logout.php`, { method: 'POST', credentials: 'include' });
  });
});

// ===== Complaints form (marketing site reuse, harmless if absent) =====
const complaintForm = document.getElementById('complaintForm');
if (complaintForm) {
  complaintForm.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('formNote').textContent = 'تم استلام شكواك، وحيتم التواصل معك قريبًا. شكرًا إلك.';
    this.reset();
  });
}

// ===== Join Requests: load real pending list + accept/reject via API =====
const requestsContainer = document.getElementById('requestsContainer');
async function loadJoinRequests(){
  if (!requestsContainer) return;
  try {
    const res = await fetch(`${API_BASE}/join_requests.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const requests = data.requests || [];

    document.getElementById('requestsCountLabel').textContent = `${requests.length} طلب بانتظار المراجعة`;

    if (requests.length === 0) {
      requestsContainer.innerHTML = '<p style="color:var(--stone); text-align:center; padding:30px;">ما في طلبات بانتظار المراجعة حاليًا.</p>';
      return;
    }

    requestsContainer.innerHTML = requests.map(r => {
      const membersRows = (r.members || []).map(m =>
        `<div class="request-row"><span>${m.full_name}</span><b>${m.age} سنة</b></div>`
      ).join('');

      return `
      <div class="request-card" style="margin-bottom:20px;" data-request-id="${r.id}">
        <div class="request-head">
          <div class="request-id">
            ${r.request_code}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>
          </div>
          <span class="request-date">${r.created_at}</span>
        </div>
        <div class="request-body">
          <div class="request-row"><span>اسم رب الأسرة</span><b>${r.head_name}</b></div>
          <div class="request-row"><span>رقم هوية رب الأسرة</span><b>${maskId(r.head_id_number)}</b></div>
          <div class="request-row"><span>تاريخ الميلاد</span><b>${r.head_birthdate}</b></div>
          <div class="request-row"><span>رقم التواصل</span><b>${r.phone1}${r.phone2 ? ' / ' + r.phone2 : ''}</b></div>
          <div class="request-row"><span>الحالة الاجتماعية</span><b>${r.marital_status}</b></div>
          ${r.health_status ? `<div class="request-row"><span>الحالة الصحية</span><b>${r.health_status}</b></div>` : ''}
          ${r.zone_name ? `<div class="request-row"><span>المربع/المنطقة</span><b>${r.zone_name}</b></div>` : ''}
          ${r.spouse_name ? `<div class="request-row"><span>اسم الزوجة</span><b>${r.spouse_name}</b></div>` : ''}
          <div class="request-row"><span>عدد أفراد الأسرة</span><b>${r.member_count} (${r.male_count} ذكور، ${r.female_count} إناث)</b></div>
          ${membersRows}
        </div>
        <div class="request-actions">
          <button class="tbtn tbtn-danger tbtn-lg" data-action="reject" data-id="${r.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
            رفض
          </button>
          <button class="tbtn tbtn-accept tbtn-lg" data-action="accept" data-id="${r.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            قبول
          </button>
        </div>
        <p class="request-result"></p>
      </div>`;
    }).join('');

    requestsContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async function(){
        const card = this.closest('.request-card');
        const resultEl = card.querySelector('.request-result');
        const action = this.dataset.action;
        const id = this.dataset.id;

        try {
          const res = await fetch(`${API_BASE}/join_requests.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(id), action }),
          });
          const data = await res.json();

          if (!res.ok) {
            resultEl.style.color = 'var(--burgundy)';
            resultEl.textContent = data.error || 'حدث خطأ';
            return;
          }

          card.querySelector('.request-actions').style.display = 'none';
          resultEl.style.color = action === 'accept' ? 'var(--teal)' : 'var(--burgundy)';
          resultEl.textContent = action === 'accept'
            ? `تم قبول الطلب — رقم بطاقة العائلة الجديدة: ${data.card_number}`
            : 'تم رفض الطلب.';
        } catch (err) {
          resultEl.style.color = 'var(--burgundy)';
          resultEl.textContent = 'تعذّر الاتصال بالسيرفر.';
        }
      });
    });
  } catch (err) {
    requestsContainer.innerHTML = '<p style="color:var(--burgundy); text-align:center; padding:30px;">تعذّر تحميل الطلبات — تأكد إنه الباك اند شغّال.</p>';
  }
}
loadJoinRequests();

// ===== Scan Distribution: real lookup by card number =====
const simulateScanBtn = document.getElementById('simulateScanBtn');
const scanResult = document.getElementById('scanResult');
const scanCodeInput = document.getElementById('scanCodeInput');

async function lookupFamilyByCard(){
  const code = (scanCodeInput?.value || '').trim();
  if (!code) { scanCodeInput?.focus(); return; }

  scanResult.innerHTML = '<p style="color:var(--stone);">جارِ البحث...</p>';

  try {
    const res = await fetch(`${API_BASE}/family_lookup.php?card_number=${encodeURIComponent(code)}`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();

    if (!res.ok) {
      scanResult.innerHTML = `<div class="scan-empty"><p style="color:var(--burgundy);">${data.error || 'ما في عائلة بهذا الرقم.'}</p></div>`;
      return;
    }

    const f = data.family;
    const last = data.last_distribution;

    // نحمّل أنواع المساعدات الحقيقية لتعبئة القائمة
    let typeOptions = '<option value="">جارِ التحميل...</option>';
    try {
      const typesRes = await fetch(`${API_BASE}/aid_types.php`, { credentials: 'include' });
      const typesData = await typesRes.json();
      const types = typesData.aid_types || [];
      typeOptions = types.length
        ? types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')
        : '<option value="">ما في أنواع مساعدات معرّفة بعد</option>';
    } catch (err) { typeOptions = '<option value="">تعذّر التحميل</option>'; }

    scanResult.innerHTML = `
      <div class="scan-found">
        <div class="scan-found-head">
          <h3>${f.head_name}</h3>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            تم العثور على العائلة
          </span>
        </div>
        <div class="scan-found-grid">
          <div><span>رقم البطاقة</span>${f.card_number}</div>
          <div><span>عدد الأفراد</span>${f.member_count}</div>
          <div><span>آخر استلام</span>${last ? `${last.aid_type_name} · ${formatDate(last.distributed_at)}` : 'لا يوجد'}</div>
          <div><span>الحالة الاجتماعية</span>${f.marital_status}</div>
        </div>
        <label>نوع المساعدة
          <select id="scanAidType">${typeOptions}</select>
        </label>
        <label>العدد<input type="number" id="scanQty" min="1" value="1"></label>
        <button class="tbtn tbtn-accept" style="width:100%; justify-content:center;" id="confirmScanBtn" data-family-id="${f.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          تأكيد التوزيع
        </button>
        <p class="request-result" id="scanConfirmMsg"></p>
      </div>
    `;

    document.getElementById('confirmScanBtn').addEventListener('click', async function(){
      const msgEl = document.getElementById('scanConfirmMsg');
      const aidTypeId = document.getElementById('scanAidType').value;
      const qty = document.getElementById('scanQty').value || 1;

      if (!aidTypeId) {
        msgEl.style.color = 'var(--burgundy)';
        msgEl.textContent = 'اختر نوع المساعدة أولاً.';
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/distributions.php`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            family_id: this.dataset.familyId,
            aid_type_id: aidTypeId,
            quantity: qty,
            distributed_at: new Date().toISOString().slice(0,10),
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          msgEl.style.color = 'var(--burgundy)';
          msgEl.textContent = data.error || 'تعذّر تسجيل التوزيع';
          return;
        }

        msgEl.style.color = 'var(--teal)';
        msgEl.textContent = 'تم تسجيل التوزيع بنجاح.';
        loadTodayScanLog();
      } catch (err) {
        msgEl.style.color = 'var(--burgundy)';
        msgEl.textContent = 'تعذّر الاتصال بالسيرفر.';
      }
    });
  } catch (err) {
    scanResult.innerHTML = '<div class="scan-empty"><p style="color:var(--burgundy);">تعذّر الاتصال بالسيرفر.</p></div>';
  }
}

if (simulateScanBtn) {
  simulateScanBtn.addEventListener('click', lookupFamilyByCard);
  scanCodeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lookupFamilyByCard(); } });
}

// آخر عمليات التوزيع اليوم (تعرض تحت لوحة المسح)
const scanLogList = document.getElementById('scanLogList');
async function loadTodayScanLog(){
  if (!scanLogList) return;
  try {
    const res = await fetch(`${API_BASE}/distributions.php`, { credentials: 'include' });
    const data = await res.json();
    const today = new Date().toISOString().slice(0,10);
    const todays = (data.distributions || []).filter(d => d.distributed_at === today);

    if (todays.length === 0) {
      scanLogList.innerHTML = '<p style="color:var(--stone); font-size:.85rem;">ما في عمليات توزيع مسجّلة اليوم بعد.</p>';
      return;
    }

    const dots = ['dot-teal','dot-copper','dot-slate','dot-burgundy'];
    scanLogList.innerHTML = todays.map((d, i) =>
      `<div class="scan-log-row"><span class="dot ${dots[i % dots.length]}"></span> ${d.family_name} — ${d.aid_type_name}</div>`
    ).join('');
  } catch (err) {
    scanLogList.innerHTML = '<p style="color:var(--burgundy); font-size:.85rem;">تعذّر تحميل السجل.</p>';
  }
}
loadTodayScanLog();

// ===== Public Family Status Check (check-status.html) =====
const checkStatusForm = document.getElementById('checkStatusForm');
if (checkStatusForm) {
  checkStatusForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const resultEl = document.getElementById('checkResult');
    const idNumber = document.getElementById('checkIdNumber').value.trim();
    resultEl.className = 'check-result show';
    resultEl.innerHTML = '<p>جارِ التحقق...</p>';

    try {
      const res = await fetch(`${API_BASE}/check_family_status.php?id_number=${encodeURIComponent(idNumber)}`);
      const data = await res.json();

      if (!res.ok) {
        resultEl.className = 'check-result show no';
        resultEl.innerHTML = `<p>${data.error || 'حدث خطأ، حاول مرة ثانية.'}</p>`;
        return;
      }

      if (data.status === 'مسجّل') {
        resultEl.className = 'check-result show ok';
        resultEl.innerHTML = `<h3>✅ عائلتك مسجّلة</h3><p>الصفة: ${data.role}<br>رقم البطاقة: <b>${data.card_number}</b></p>`;
      } else if (data.status === 'قيد المراجعة') {
        resultEl.className = 'check-result show pending';
        resultEl.innerHTML = `<h3>⏳ طلبك قيد المراجعة</h3><p>رقم الطلب المرجعي: <b>${data.request_code}</b><br>رح يتم التواصل معك بعد المراجعة.</p>`;
      } else if (data.status === 'مرفوض') {
        resultEl.className = 'check-result show no';
        resultEl.innerHTML = `<h3>❌ تم رفض طلب سابق</h3><p>رقم الطلب المرجعي: <b>${data.request_code}</b><br>للاستفسار، تواصل مع إدارة المخيم.</p>`;
      } else {
        resultEl.className = 'check-result show no';
        resultEl.innerHTML = `<h3>غير مسجّل</h3><p>ما لقينا أي تسجيل بهالرقم. فيك <a href="register.html">تسجّل بياناتك من هون</a>.</p>`;
      }
    } catch (err) {
      resultEl.className = 'check-result show no';
      resultEl.innerHTML = '<p>تعذّر الاتصال بالسيرفر.</p>';
    }
  });
}

// ===== Public Registration Form (register.html) =====
const membersList = document.getElementById('membersList');
if (membersList) {
  let memberRowCount = 0;

  function addMemberRow(){
    memberRowCount++;
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `
      <input type="text" class="member-name" placeholder="اسم الفرد">
      <input type="number" class="member-age" min="0" placeholder="العمر">
      <button type="button" class="member-remove" aria-label="حذف">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    `;
    row.querySelector('.member-remove').addEventListener('click', () => row.remove());
    membersList.appendChild(row);
  }

  document.getElementById('addMemberRowBtn').addEventListener('click', addMemberRow);
  // ابدأ بصف واحد جاهز
  addMemberRow();

  // تعبئة قائمة المربعات/المناطق من endpoint عام (بدون تسجيل دخول)
  const regZoneSelect = document.getElementById('regZone');
  if (regZoneSelect) {
    fetch(`${API_BASE}/public_zones.php`)
      .then(res => res.json())
      .then(data => {
        const zones = data.zones || [];
        if (zones.length) {
          regZoneSelect.innerHTML = '<option value="">غير محدد</option>' +
            zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
        }
      })
      .catch(() => { /* يبقى بس خيار "غير محدد" */ });
  }

  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const result = document.getElementById('registerResult');
    result.style.color = 'var(--teal)';
    result.textContent = 'جارِ إرسال الطلب...';

    const members = [...membersList.querySelectorAll('.member-row')].map(row => ({
      full_name: row.querySelector('.member-name').value.trim(),
      age: row.querySelector('.member-age').value || 0,
    })).filter(m => m.full_name !== '');

    const payload = {
      head_name: document.getElementById('regHeadName').value.trim(),
      head_id_number: document.getElementById('regHeadId').value.trim(),
      head_birthdate: document.getElementById('regHeadBirthdate').value,
      phone1: document.getElementById('regPhone1').value.trim(),
      phone2: document.getElementById('regPhone2').value.trim(),
      marital_status: document.getElementById('regMaritalStatus').value,
      health_status: document.getElementById('regHealthStatus').value.trim(),
      zone_id: regZoneSelect ? regZoneSelect.value : '',
      spouse_name: document.getElementById('regSpouseName').value.trim(),
      spouse_id_number: document.getElementById('regSpouseId').value.trim(),
      member_count: document.getElementById('regMemberCount').value || members.length || 1,
      male_count: document.getElementById('regMaleCount').value || 0,
      female_count: document.getElementById('regFemaleCount').value || 0,
      members,
    };

    try {
      const res = await fetch(`${API_BASE}/submit_join_request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        result.style.color = 'var(--burgundy)';
        result.textContent = data.error || 'تعذّر إرسال الطلب';
        return;
      }

      result.style.color = 'var(--teal)';
      result.textContent = `تم استلام طلبك بنجاح — رقم الطلب المرجعي: ${data.request_code}. رح يتم التواصل معك بعد المراجعة.`;
      registerForm.reset();
      membersList.innerHTML = '';
      addMemberRow();
    } catch (err) {
      result.style.color = 'var(--burgundy)';
      result.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}
// ===== Generic modal open/close =====
function openModal(id){
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id){
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e){
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
document.querySelectorAll('[data-open-modal]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.openModal));
});
document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});

// ===== Dashboard overview: load real stats from the database =====
const statTotalFamiliesHero = document.getElementById('statTotalFamiliesHero');
if (statTotalFamiliesHero) {
  (async function loadDashboardStats(){
    try {
      const res = await fetch(`${API_BASE}/dashboard_stats.php`, { credentials: 'include' });
      if (res.status === 401) { window.location.href = 'index.html'; return; }
      const s = await res.json();

      statTotalFamiliesHero.textContent = s.total_families;
      document.getElementById('statAidTypes').textContent = s.total_aid_types;
      document.getElementById('statTotalDist').textContent = s.total_distributions;
      document.getElementById('statTotalIndividuals').textContent = s.total_individuals;
      document.getElementById('statTotalFamilies').textContent = s.total_families;
      document.getElementById('statDistMonth').textContent = s.distributions_month;
      document.getElementById('statDistWeek').textContent = s.distributions_week;
      document.getElementById('statDistToday').textContent = s.distributions_today;
      document.getElementById('statAvgMembers').textContent = s.avg_members_per_family;
      document.getElementById('statAvgDist').textContent = s.avg_dist_per_beneficiary_family;
      document.getElementById('statCoverage').textContent = s.coverage_percent + '%';
      document.getElementById('statCoverageBar').style.width = s.coverage_percent + '%';
      document.getElementById('statCoverageLabel').textContent =
        `${s.families_with_aid} من ${s.total_families} عائلة استلمت`;
    } catch (err) {
      console.error('تعذّر تحميل إحصائيات لوحة التحكم', err);
    }
  })();
}

// ===== Families page: load real list from the database =====
function calcAge(birthdateStr){
  const b = new Date(birthdateStr);
  if (isNaN(b)) return '—';
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000)) + ' سنة';
}
function maskId(idNumber){
  if (!idNumber || idNumber.length < 4) return idNumber || '—';
  return idNumber.slice(0,1) + '•• •••• ••' + idNumber.slice(-1);
}
function formatDate(d){
  if (!d) return '—';
  const parts = d.split('-'); // YYYY-MM-DD -> DD/MM/YYYY
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
}

const familiesTableBody = document.getElementById('familiesTableBody');
let familiesCurrentPage = 1;

function getFamiliesFilters(){
  return {
    marital: document.getElementById('filterMaritalStatus')?.value || '',
    zoneId: document.getElementById('filterZone')?.value || '',
    gender: document.getElementById('filterGender')?.value || '',
  };
}

function renderFamiliesPagination(totalItems, pageSize){
  const container = document.getElementById('familiesPagination');
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (familiesCurrentPage > totalPages) familiesCurrentPage = totalPages;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${familiesCurrentPage === 1 ? 'disabled' : ''} data-page="${familiesCurrentPage - 1}">‹ السابق</button>`;

  const addBtn = (p) => `<button class="${p === familiesCurrentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  const pagesToShow = new Set([1, totalPages, familiesCurrentPage, familiesCurrentPage - 1, familiesCurrentPage + 1]);
  let lastShown = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (!pagesToShow.has(p)) continue;
    if (p - lastShown > 1) html += `<span class="page-ellipsis">…</span>`;
    html += addBtn(p);
    lastShown = p;
  }

  html += `<button ${familiesCurrentPage === totalPages ? 'disabled' : ''} data-page="${familiesCurrentPage + 1}">التالي ›</button>`;
  container.innerHTML = html;

  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', function(){
      familiesCurrentPage = Number(this.dataset.page);
      renderFamiliesTablePage();
    });
  });
}

function renderFamiliesTablePage(){
  const all = window._familiesCache || [];
  const filters = getFamiliesFilters();

  const filtered = all.filter(f => {
    if (filters.marital && f.marital_status !== filters.marital) return false;
    if (filters.zoneId && String(f.zone_id || '') !== filters.zoneId) return false;
    if (filters.gender && f.head_gender !== filters.gender) return false;
    return true;
  });

  const countLabel = document.getElementById('familiesCountLabel');
  const totalAll = all.length;
  if (countLabel) {
    countLabel.textContent = filtered.length === totalAll
      ? `${totalAll} عائلة مسجّلة`
      : `${filtered.length} من ${totalAll} عائلة (بعد الفلترة)`;
  }

  const pageSize = Number(document.getElementById('familiesPageSize')?.value || 20);

  if (filtered.length === 0) {
    familiesTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--stone); padding:24px;">ما في نتائج مطابقة.</td></tr>`;
    document.getElementById('familiesPagination').innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (familiesCurrentPage > totalPages) familiesCurrentPage = totalPages;
  const start = (familiesCurrentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const dots = ['dot-burgundy','dot-slate','dot-teal','dot-copper'];
  familiesTableBody.innerHTML = pageItems.map((f, i) => `
    <tr data-id="${f.id}">
      <td><input type="checkbox"></td>
      <td><b>${f.card_number}</b></td>
      <td class="name-cell"><span class="dot ${dots[i % dots.length]}"></span>${f.head_name}</td>
      <td>${maskId(f.head_id_number)}</td>
      <td>${f.phone || '<span class="cell-empty">—</span>'}</td>
      <td>${f.head_birthdate ? formatDate(f.head_birthdate) : '<span class="cell-empty">—</span>'}</td>
      <td>${f.head_age != null ? f.head_age + ' سنة' : '<span class="cell-empty">—</span>'}</td>
      <td>${f.marital_status}</td>
      <td>${f.spouse_name || '<span class="cell-empty">—</span>'}</td>
      <td>${f.zone_name || '<span class="cell-empty">—</span>'}</td>
      <td>
        <button class="icn-btn edit-family-btn" data-id="${f.id}" title="تعديل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z"/></svg></button>
        <button class="icn-btn delete-family-btn admin-only" data-id="${f.id}" data-name="${f.head_name}" title="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
      </td>
    </tr>
  `).join('');

  familiesTableBody.querySelectorAll('.delete-family-btn').forEach(btn => {
    btn.addEventListener('click', async function(){
      if (!confirm(`متأكد إنك بدك تحذف عائلة "${this.dataset.name}"؟ هذا الإجراء نهائي.`)) return;
      try {
        const res = await fetch(`${API_BASE}/families.php?id=${this.dataset.id}`, {
          method: 'DELETE', credentials: 'include',
        });
        if (res.ok) loadFamilies(document.getElementById('familiesSearchInput')?.value.trim());
        else alert('تعذّر حذف العائلة.');
      } catch (err) {
        alert('تعذّر الاتصال بالسيرفر.');
      }
    });
  });

  familiesTableBody.querySelectorAll('.edit-family-btn').forEach(btn => {
    btn.addEventListener('click', function(){
      const family = (window._familiesCache || []).find(f => String(f.id) === this.dataset.id);
      if (!family) return;
      openFamilyEditForm(family);
    });
  });

  renderFamiliesPagination(filtered.length, pageSize);
}

async function loadZonesFilterOptions(){
  const select = document.getElementById('filterZone');
  if (!select) return;
  try {
    const res = await fetch(`${API_BASE}/zones.php`, { credentials: 'include' });
    const data = await res.json();
    const zones = data.zones || [];
    select.innerHTML = '<option value="">الكل</option>' + zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
  } catch (err) { /* يبقى بس خيار "الكل" */ }
}

['filterMaritalStatus', 'filterZone', 'filterGender', 'familiesPageSize'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => { familiesCurrentPage = 1; renderFamiliesTablePage(); });
});

async function loadFamilies(query){
  if (!familiesTableBody) return;
  try {
    const url = query ? `${API_BASE}/families.php?q=${encodeURIComponent(query)}` : `${API_BASE}/families.php`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const families = data.families || [];

    window._familiesCache = families; // نخزّنها مؤقتًا للفلترة والصفحات وفورم التعديل بدون طلبات إضافية
    familiesCurrentPage = 1;

    if (families.length === 0) {
      const countLabel = document.getElementById('familiesCountLabel');
      if (countLabel) countLabel.textContent = query ? '0 نتيجة' : '0 عائلة مسجّلة';
      familiesTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--stone); padding:24px;">${query ? 'ما في نتائج مطابقة.' : 'ما في عائلات مسجّلة بعد.'}</td></tr>`;
      document.getElementById('familiesPagination').innerHTML = '';
      return;
    }

    await loadZonesFilterOptions();
    renderFamiliesTablePage();
  } catch (err) {
    familiesTableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:var(--burgundy); padding:24px;">تعذّر تحميل العائلات — تأكد إنه الباك اند شغّال.</td></tr>';
  }
}
loadFamilies();

// بحث حي (مع تأخير بسيط عشان ما يرسل طلب لكل ضغطة زر)
const familiesSearchInput = document.getElementById('familiesSearchInput');
if (familiesSearchInput) {
  let searchDebounce;
  familiesSearchInput.addEventListener('input', function(){
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadFamilies(this.value.trim()), 350);
  });
}

// حذف كل العائلات
const deleteAllFamiliesBtn = document.getElementById('deleteAllFamiliesBtn');
if (deleteAllFamiliesBtn) {
  deleteAllFamiliesBtn.addEventListener('click', async function(){
    if (!confirm('متأكد إنك بدك تحذف كل العائلات نهائيًا؟ هذا الإجراء ما بينرجع.')) return;
    try {
      const res = await fetch(`${API_BASE}/families.php?all=1`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) loadFamilies();
      else alert('تعذّر حذف العائلات.');
    } catch (err) {
      alert('تعذّر الاتصال بالسيرفر.');
    }
  });
}

// تصدير جدول العائلات إلى Excel
const exportFamiliesBtn = document.getElementById('exportFamiliesBtn');
if (exportFamiliesBtn) {
  exportFamiliesBtn.addEventListener('click', function(){
    if (typeof XLSX === 'undefined') {
      alert('مكتبة التصدير لسا ما تحمّلت (تأكد من الاتصال بالإنترنت) — جرب مرة ثانية.');
      return;
    }
    const filters = getFamiliesFilters();
    const all = window._familiesCache || [];
    const rows = all.filter(f => {
      if (filters.marital && f.marital_status !== filters.marital) return false;
      if (filters.zoneId && String(f.zone_id || '') !== filters.zoneId) return false;
      if (filters.gender && f.head_gender !== filters.gender) return false;
      return true;
    }).map(f => ({
      'رقم البطاقة': f.card_number,
      'اسم رب الأسرة': f.head_name,
      'رقم هوية رب الأسرة': f.head_id_number,
      'رقم الجوال': f.phone || '',
      'تاريخ ميلاد رب الأسرة': f.head_birthdate || '',
      'العمر': f.head_age != null ? f.head_age : '',
      'الحالة الاجتماعية': f.marital_status,
      'اسم الزوجة': f.spouse_name || '',
      'المربع/المنطقة': f.zone_name || '',
    }));

    if (rows.length === 0) { alert('ما في بيانات لتصديرها.'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العائلات');
    XLSX.writeFile(wb, 'عائلات-مخيم-الصقر.xlsx');
  });
}

// استيراد عائلات من ملف Excel
const importFamiliesBtn = document.getElementById('importFamiliesBtn');
const importFamiliesInput = document.getElementById('importFamiliesInput');
if (importFamiliesBtn && importFamiliesInput) {
  importFamiliesBtn.addEventListener('click', () => importFamiliesInput.click());

  importFamiliesInput.addEventListener('change', async function(){
    const file = this.files[0];
    if (!file) return;
    const note = document.getElementById('importFamiliesNote');
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ قراءة الملف...';

    if (typeof XLSX === 'undefined') {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'مكتبة قراءة الإكسل لسا ما تحمّلت — تأكد من الاتصال بالإنترنت.';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // حوّل خانات التاريخ (لو انقرت ككائن Date) لصيغة YYYY-MM-DD يلي بيتوقعها السيرفر
      const dateFields = ['تاريخ ميلاد رب الأسرة', 'تاريخ ميلاد رب الاسرة', 'تاريخ الميلاد', 'تاريخ ميلاد', 'الميلاد', 'تاريخ الولادة', 'ت. الميلاد', 'تاريخ ميلاد الزوجة', 'تاريخ ميلاد الزوجه'];
      rows.forEach(row => {
        dateFields.forEach(field => {
          if (row[field] instanceof Date) {
            row[field] = row[field].toISOString().slice(0, 10);
          }
        });
      });

      note.textContent = `جارِ استيراد ${rows.length} صف...`;

      const res = await fetch(`${API_BASE}/families_import.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر الاستيراد';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = `تم استيراد ${data.inserted} عائلة بنجاح` +
        (data.skipped_count ? `، وتخطّينا ${data.skipped_count} صف (${data.skipped_details.slice(0,3).join(' | ')}${data.skipped_count > 3 ? '...' : ''})` : '') + '.';
      loadFamilies();
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر قراءة الملف — تأكد إنه بصيغة Excel صحيحة.';
    } finally {
      importFamiliesInput.value = '';
    }
  });
}

// تعبئة قائمة "المربع/المنطقة" من بيانات حقيقية
const famZoneSelect = document.getElementById('famZone');
async function fillFamilyZoneSelect(){
  if (!famZoneSelect) return;
  try {
    const res = await fetch(`${API_BASE}/zones.php`, { credentials: 'include' });
    const data = await res.json();
    const zones = data.zones || [];
    famZoneSelect.innerHTML = '<option value="">غير محدد</option>' +
      zones.map(z => `<option value="${z.id}">${z.name}</option>`).join('');
  } catch (err) { /* يبقى بس خيار "غير محدد" */ }
}

// فتح فورم "إضافة عائلة" بوضعه الافتراضي (إضافة جديدة)
document.querySelectorAll('[data-open-modal="addFamilyModal"]').forEach(btn => {
  btn.addEventListener('click', async function(){
    const addFamilyForm = document.getElementById('addFamilyForm');
    if (addFamilyForm) addFamilyForm.reset();
    document.getElementById('famEditId').value = '';
    document.getElementById('addFamilyModalTitle').textContent = 'إضافة عائلة جديدة';
    document.getElementById('addFamilySubmitBtn').textContent = 'حفظ العائلة';
    const field = document.getElementById('newFamilyCardNumber');
    if (field) field.value = 'سيُنشأ تلقائيًا عند الحفظ';
    await fillFamilyZoneSelect();
  });
});

// فتح نفس الفورم بوضع "تعديل" وتعبئته ببيانات العائلة المختارة
async function openFamilyEditForm(family){
  await fillFamilyZoneSelect();
  document.getElementById('famEditId').value = family.id;
  document.getElementById('famHeadName').value = family.head_name || '';
  document.getElementById('famHeadIdNumber').value = family.head_id_number || '';
  document.getElementById('famHeadGender').value = family.head_gender || '';
  document.getElementById('famPhone').value = family.phone || '';
  document.getElementById('famHeadBirthdate').value = family.head_birthdate || '';
  document.getElementById('famHeadAge').value = family.head_age != null ? family.head_age + ' سنة' : '';
  document.getElementById('famMaritalStatus').value = family.marital_status || 'متزوج';
  document.getElementById('famMemberCount').value = family.member_count || 1;
  document.getElementById('famSpouseName').value = family.spouse_name || '';
  if (famZoneSelect) famZoneSelect.value = family.zone_id || '';
  document.getElementById('newFamilyCardNumber').value = family.card_number;
  document.getElementById('addFamilyModalTitle').textContent = `تعديل عائلة: ${family.head_name}`;
  document.getElementById('addFamilySubmitBtn').textContent = 'حفظ التعديلات';
  openModal('addFamilyModal');
}

// ===== Add/Edit Family form (families.html) — real POST to the database =====
const addFamilyForm = document.getElementById('addFamilyForm');
if (addFamilyForm) {
  addFamilyForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addFamilyNote');
    const editId = document.getElementById('famEditId').value;
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    const payload = {
      head_name: document.getElementById('famHeadName').value.trim(),
      head_id_number: document.getElementById('famHeadIdNumber').value.trim(),
      head_gender: document.getElementById('famHeadGender').value,
      phone: document.getElementById('famPhone').value.trim(),
      head_birthdate: document.getElementById('famHeadBirthdate').value,
      marital_status: document.getElementById('famMaritalStatus').value,
      spouse_name: document.getElementById('famSpouseName').value.trim(),
      member_count: document.getElementById('famMemberCount').value || 1,
      zone_id: document.getElementById('famZone')?.value || '',
    };
    if (editId) payload.id = Number(editId);

    try {
      const res = await fetch(`${API_BASE}/families.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ العائلة';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = editId ? 'تم حفظ التعديلات بنجاح.' : `تمت إضافة العائلة بنجاح — رقم البطاقة: ${data.card_number}`;
      loadFamilies();
      setTimeout(() => { closeModal('addFamilyModal'); addFamilyForm.reset(); note.textContent = ''; }, 2000);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Aid Types page: load real list, delete, add =====
const aidTypesGrid = document.getElementById('aidTypesGrid');

async function loadAidTypes(){
  if (!aidTypesGrid) return;
  try {
    const res = await fetch(`${API_BASE}/aid_types.php`, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const types = data.aid_types || [];

    const countLabel = document.getElementById('aidTypesCountLabel');
    if (countLabel) countLabel.textContent = `${types.length} نوع مساعدة معرّف`;

    if (types.length === 0) {
      aidTypesGrid.innerHTML = '<p style="color:var(--stone); text-align:center; padding:30px; grid-column:1/-1;">ما في أنواع مساعدات معرّفة بعد. دوس "إضافة نوع" لتبدأ.</p>';
      return;
    }

    aidTypesGrid.innerHTML = types.map(t => {
      const accent = colorVarMap[t.color] || 'var(--gold-deep)';
      const bg = colorBgMap[t.color] || 'var(--gold-pale)';
      return `
      <div class="type-card" style="--accent:${accent};">
        <div class="type-actions">
          <button class="icn-btn delete-type-btn" data-id="${t.id}" data-name="${t.name}" title="حذف">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </div>
        <div class="type-icon" style="background:${bg}; color:${accent};">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12a8 8 0 1 1-3-6.24"/><path d="M20 4v5h-5"/></svg>
        </div>
        <h3>${t.name}</h3><span class="type-tag">${t.category}</span>
      </div>`;
    }).join('');

    aidTypesGrid.querySelectorAll('.delete-type-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm(`متأكد إنك بدك تحذف "${this.dataset.name}"؟`)) return;
        try {
          const res = await fetch(`${API_BASE}/aid_types.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          const data = await res.json();
          if (res.ok) loadAidTypes();
          else alert(data.error || 'تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    aidTypesGrid.innerHTML = '<p style="color:var(--burgundy); text-align:center; padding:30px; grid-column:1/-1;">تعذّر تحميل أنواع المساعدات — تأكد إنه الباك اند شغّال.</p>';
  }
}
loadAidTypes();

// ===== Add Aid Type form (aid-types.html) — real POST =====
const addTypeForm = document.getElementById('addTypeForm');
if (addTypeForm) {
  let selectedTypeColor = 'gold';
  document.querySelectorAll('#addTypeForm .color-swatch').forEach(sw => {
    sw.addEventListener('click', function(){
      document.querySelectorAll('#addTypeForm .color-swatch').forEach(s => s.classList.remove('selected'));
      this.classList.add('selected');
      selectedTypeColor = this.dataset.color;
    });
  });

  addTypeForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addTypeNote');
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    const payload = {
      name: document.getElementById('typeName').value.trim(),
      category: document.getElementById('typeCategory').value,
      color: selectedTypeColor,
      notes: document.getElementById('typeNotes').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/aid_types.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ النوع';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = 'تمت إضافة النوع بنجاح.';
      loadAidTypes();
      setTimeout(() => { closeModal('addTypeModal'); addTypeForm.reset(); note.textContent = ''; }, 1400);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Individuals page: load real list, search, delete, export =====
const individualsTableBody = document.getElementById('individualsTableBody');

async function loadIndividuals(query){
  if (!individualsTableBody) return;
  try {
    const url = query ? `${API_BASE}/individuals.php?q=${encodeURIComponent(query)}` : `${API_BASE}/individuals.php`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const individuals = data.individuals || [];

    const countLabel = document.getElementById('individualsCountLabel');
    if (countLabel) countLabel.textContent = `${individuals.length} فرد مسجّل`;

    if (individuals.length === 0) {
      individualsTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--stone); padding:24px;">${query ? 'ما في نتائج مطابقة.' : 'ما في أفراد مسجّلين بعد.'}</td></tr>`;
      return;
    }

    window._individualsCache = individuals;
    const dots = ['dot-burgundy','dot-slate','dot-teal','dot-copper'];
    individualsTableBody.innerHTML = individuals.map((p, i) => `
      <tr>
        <td><input type="checkbox"></td>
        <td class="name-cell"><span class="dot ${dots[i % dots.length]}"></span>${p.full_name}</td>
        <td>${maskId(p.id_number)}</td>
        <td>${formatDate(p.birthdate)}</td>
        <td>${p.age != null ? p.age + ' سنة' : '—'}</td>
        <td>${p.gender}</td>
        <td>${p.relation}</td>
        <td>${p.family_name}</td>
        <td>${p.category_name ? `<span class="mini-badge">${p.category_name}</span>` : '—'}</td>
        <td>
          <button class="icn-btn edit-individual-btn" data-id="${p.id}" title="تعديل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z"/></svg></button>
          <button class="icn-btn delete-individual-btn admin-only" data-id="${p.id}" data-name="${p.full_name}" title="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
        </td>
      </tr>
    `).join('');

    individualsTableBody.querySelectorAll('.delete-individual-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm(`متأكد إنك بدك تحذف "${this.dataset.name}"؟`)) return;
        try {
          const res = await fetch(`${API_BASE}/individuals.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) loadIndividuals(document.getElementById('individualsSearchInput')?.value.trim());
          else alert('تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });

    individualsTableBody.querySelectorAll('.edit-individual-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        const person = (window._individualsCache || []).find(p => String(p.id) === this.dataset.id);
        if (!person) return;
        await openIndividualEditForm(person);
      });
    });
  } catch (err) {
    individualsTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--burgundy); padding:24px;">تعذّر تحميل الأفراد — تأكد إنه الباك اند شغّال.</td></tr>';
  }
}
loadIndividuals();

const individualsSearchInput = document.getElementById('individualsSearchInput');
if (individualsSearchInput) {
  let indSearchDebounce;
  individualsSearchInput.addEventListener('input', function(){
    clearTimeout(indSearchDebounce);
    indSearchDebounce = setTimeout(() => loadIndividuals(this.value.trim()), 350);
  });
}

const deleteAllIndividualsBtn = document.getElementById('deleteAllIndividualsBtn');
if (deleteAllIndividualsBtn) {
  deleteAllIndividualsBtn.addEventListener('click', async function(){
    if (!confirm('متأكد إنك بدك تحذف كل الأفراد نهائيًا؟')) return;
    try {
      const res = await fetch(`${API_BASE}/individuals.php?all=1`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) loadIndividuals();
      else alert('تعذّر الحذف.');
    } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
  });
}

const exportIndividualsBtn = document.getElementById('exportIndividualsBtn');
if (exportIndividualsBtn) {
  exportIndividualsBtn.addEventListener('click', function(){
    exportTableToExcel('#individualsTable', 'أفراد-مخيم-الصقر.xlsx');
  });
}

// تعبئة قوائم "العائلة" و"فئة خاصة" بالفورم عند فتحه، من بيانات حقيقية
const indFamilySelect = document.getElementById('indFamily');
const indCategorySelect = document.getElementById('indCategory');

async function fillIndividualSelects(){
  if (indFamilySelect) {
    try {
      const res = await fetch(`${API_BASE}/families.php`, { credentials: 'include' });
      const data = await res.json();
      const families = data.families || [];
      indFamilySelect.innerHTML = families.length
        ? families.map(f => `<option value="${f.id}">${f.head_name} (${f.card_number})</option>`).join('')
        : '<option value="">ما في عائلات مسجّلة بعد</option>';
    } catch (err) { indFamilySelect.innerHTML = '<option value="">تعذّر التحميل</option>'; }
  }
  if (indCategorySelect) {
    try {
      const res = await fetch(`${API_BASE}/special_categories.php`, { credentials: 'include' });
      const data = await res.json();
      const cats = data.categories || [];
      indCategorySelect.innerHTML = '<option value="">لا يوجد</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (err) { /* يبقى بس خيار "لا يوجد" */ }
  }
}

document.querySelectorAll('[data-open-modal="addIndividualModal"]').forEach(btn => {
  btn.addEventListener('click', async function(){
    const addIndividualForm = document.getElementById('addIndividualForm');
    if (addIndividualForm) addIndividualForm.reset();
    document.getElementById('indEditId').value = '';
    document.getElementById('addIndividualModalTitle').textContent = 'إضافة فرد جديد';
    document.getElementById('addIndividualSubmitBtn').textContent = 'حفظ الفرد';
    await fillIndividualSelects();
  });
});

async function openIndividualEditForm(person){
  await fillIndividualSelects();
  document.getElementById('indEditId').value = person.id;
  document.getElementById('indFullName').value = person.full_name || '';
  document.getElementById('indIdNumber').value = person.id_number || '';
  document.getElementById('indBirthdate').value = person.birthdate || '';
  document.getElementById('indAge').value = person.age != null ? person.age + ' سنة' : '';
  document.getElementById('indGender').value = person.gender || 'ذكر';
  document.getElementById('indRelation').value = person.relation || 'أخرى';
  if (indFamilySelect) indFamilySelect.value = person.family_id;
  if (indCategorySelect) indCategorySelect.value = person.special_category_id || '';
  document.getElementById('addIndividualModalTitle').textContent = `تعديل: ${person.full_name}`;
  document.getElementById('addIndividualSubmitBtn').textContent = 'حفظ التعديلات';
  openModal('addIndividualModal');
}

// ===== Add/Edit Individual form (individuals.html) — real POST =====
const addIndividualForm = document.getElementById('addIndividualForm');
if (addIndividualForm) {
  addIndividualForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addIndividualNote');
    const editId = document.getElementById('indEditId').value;
    note.style.color = 'var(--teal)';
    note.textContent = 'جارِ الحفظ...';

    const payload = {
      full_name: document.getElementById('indFullName').value.trim(),
      id_number: document.getElementById('indIdNumber').value.trim(),
      birthdate: document.getElementById('indBirthdate').value,
      gender: document.getElementById('indGender').value,
      relation: document.getElementById('indRelation').value,
      family_id: document.getElementById('indFamily').value,
      special_category_id: document.getElementById('indCategory').value,
    };
    if (editId) payload.id = Number(editId);

    try {
      const res = await fetch(`${API_BASE}/individuals.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ الفرد';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = editId ? 'تم حفظ التعديلات بنجاح.' : 'تمت إضافة الفرد بنجاح.';
      loadIndividuals();
      setTimeout(() => { closeModal('addIndividualModal'); addIndividualForm.reset(); note.textContent = ''; }, 1400);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}

// ===== Aid Log page: load real distributions, search, delete, export, stats =====
const aidLogTableBody = document.getElementById('aidLogTableBody');

function computeAidLogStats(rows){
  const totalEl = document.getElementById('statLogTotal');
  if (!totalEl) return;

  document.getElementById('statLogTotal').textContent = rows.length;

  const uniqueFamilies = new Set(rows.map(r => r.card_number));
  document.getElementById('statLogFamilies').textContent = uniqueFamilies.size;

  const now = new Date();
  const monthCount = rows.filter(r => {
    const d = new Date(r.distributed_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  document.getElementById('statLogMonth').textContent = monthCount;

  const typeCounts = {};
  rows.forEach(r => { typeCounts[r.aid_type_name] = (typeCounts[r.aid_type_name] || 0) + 1; });
  const top = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('statTopAidType').textContent = top ? top[0] : '—';
  document.getElementById('statTopAidTypeLabel').textContent = top ? `الأكثر توزيعًا — ${top[1]} عملية` : 'الأكثر توزيعًا';
}

async function loadDistributions(query){
  if (!aidLogTableBody) return;
  try {
    const url = query ? `${API_BASE}/distributions.php?q=${encodeURIComponent(query)}` : `${API_BASE}/distributions.php`;
    const res = await fetch(url, { credentials: 'include' });
    if (res.status === 401) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    const rows = data.distributions || [];

    const countLabel = document.getElementById('aidLogCountLabel');
    if (countLabel) countLabel.textContent = `${rows.length} عملية توزيع`;
    computeAidLogStats(rows);

    if (rows.length === 0) {
      aidLogTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--stone); padding:24px;">${query ? 'ما في نتائج مطابقة.' : 'ما في عمليات توزيع مسجّلة بعد.'}</td></tr>`;
      return;
    }

    const dots = ['dot-burgundy','dot-slate','dot-teal','dot-copper'];
    aidLogTableBody.innerHTML = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="name-cell"><span class="dot ${dots[i % dots.length]}"></span>${r.family_name}</td>
        <td><span class="pill">${r.aid_type_name}</span></td>
        <td>${formatDate(r.distributed_at)}</td>
        <td><span class="count-badge">${r.quantity}</span></td>
        <td><button class="icn-btn delete-dist-btn" data-id="${r.id}" title="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button></td>
      </tr>
    `).join('');

    aidLogTableBody.querySelectorAll('.delete-dist-btn').forEach(btn => {
      btn.addEventListener('click', async function(){
        if (!confirm('متأكد إنك بدك تحذف عملية التوزيع هاي؟')) return;
        try {
          const res = await fetch(`${API_BASE}/distributions.php?id=${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) loadDistributions(document.getElementById('aidLogSearchInput')?.value.trim());
          else alert('تعذّر الحذف.');
        } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
      });
    });
  } catch (err) {
    aidLogTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--burgundy); padding:24px;">تعذّر تحميل السجل — تأكد إنه الباك اند شغّال.</td></tr>';
  }
}
loadDistributions();

const aidLogSearchInput = document.getElementById('aidLogSearchInput');
if (aidLogSearchInput) {
  let logSearchDebounce;
  aidLogSearchInput.addEventListener('input', function(){
    clearTimeout(logSearchDebounce);
    logSearchDebounce = setTimeout(() => loadDistributions(this.value.trim()), 350);
  });
}

const deleteAllDistributionsBtn = document.getElementById('deleteAllDistributionsBtn');
if (deleteAllDistributionsBtn) {
  deleteAllDistributionsBtn.addEventListener('click', async function(){
    if (!confirm('متأكد إنك بدك تحذف كل سجل التوزيع نهائيًا؟')) return;
    try {
      const res = await fetch(`${API_BASE}/distributions.php?all=1`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) loadDistributions();
      else alert('تعذّر الحذف.');
    } catch (err) { alert('تعذّر الاتصال بالسيرفر.'); }
  });
}

const exportDistributionsBtn = document.getElementById('exportDistributionsBtn');
if (exportDistributionsBtn) {
  exportDistributionsBtn.addEventListener('click', function(){
    exportTableToExcel('#aidLogTable', 'سجل-المساعدات-مخيم-الصقر.xlsx');
  });
}

// تعبئة قوائم "العائلة" و"نوع المساعدة" عند فتح فورم الإضافة اليدوية
const distFamilySelect = document.getElementById('distFamily');
const distTypeSelect = document.getElementById('distType');
document.querySelectorAll('[data-open-modal="addDistributionModal"]').forEach(btn => {
  btn.addEventListener('click', async function(){
    if (distFamilySelect) {
      try {
        const res = await fetch(`${API_BASE}/families.php`, { credentials: 'include' });
        const data = await res.json();
        const families = data.families || [];
        distFamilySelect.innerHTML = families.length
          ? families.map(f => `<option value="${f.id}">${f.head_name} (${f.card_number})</option>`).join('')
          : '<option value="">ما في عائلات مسجّلة بعد</option>';
      } catch (err) { distFamilySelect.innerHTML = '<option value="">تعذّر التحميل</option>'; }
    }
    if (distTypeSelect) {
      try {
        const res = await fetch(`${API_BASE}/aid_types.php`, { credentials: 'include' });
        const data = await res.json();
        const types = data.aid_types || [];
        distTypeSelect.innerHTML = types.length
          ? types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')
          : '<option value="">ما في أنواع مساعدات معرّفة بعد</option>';
      } catch (err) { distTypeSelect.innerHTML = '<option value="">تعذّر التحميل</option>'; }
    }
  });
});

// ===== Add Manual Distribution form (aid-log.html) — real POST (single or bulk) =====
const distAllFamiliesCheckbox = document.getElementById('distAllFamilies');
const distFamilyField = document.getElementById('distFamilyField');
if (distAllFamiliesCheckbox) {
  distAllFamiliesCheckbox.addEventListener('change', function(){
    const familySelect = document.getElementById('distFamily');
    if (this.checked) {
      distFamilyField.style.display = 'none';
      familySelect.required = false;
    } else {
      distFamilyField.style.display = '';
      familySelect.required = true;
    }
  });
}

const addDistributionForm = document.getElementById('addDistributionForm');
if (addDistributionForm) {
  addDistributionForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const note = document.getElementById('addDistributionNote');
    const allFamilies = distAllFamiliesCheckbox?.checked;

    if (allFamilies && !confirm('متأكد إنك بدك تسجّل هالمساعدة كمُستلَمة لكل العائلات المسجّلة دفعة وحدة؟')) {
      return;
    }

    note.style.color = 'var(--teal)';
    note.textContent = allFamilies ? 'جارِ التوزيع على كل العائلات...' : 'جارِ الحفظ...';

    const payload = {
      aid_type_id: document.getElementById('distType').value,
      quantity: document.getElementById('distQty').value || 1,
      distributed_at: document.getElementById('distDate').value,
    };
    if (allFamilies) {
      payload.all_families = true;
    } else {
      payload.family_id = document.getElementById('distFamily').value;
    }

    try {
      const res = await fetch(`${API_BASE}/distributions.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        note.style.color = 'var(--burgundy)';
        note.textContent = data.error || 'تعذّر حفظ عملية التوزيع';
        return;
      }

      note.style.color = 'var(--teal)';
      note.textContent = allFamilies
        ? `تم تسجيل الاستلام لـ ${data.added} عائلة بنجاح${data.skipped ? ` (تجاوزنا ${data.skipped} عائلة استلمت هذا النوع بنفس التاريخ مسبقًا)` : ''}.`
        : 'تمت إضافة عملية التوزيع بنجاح.';
      loadDistributions();
      setTimeout(() => {
        closeModal('addDistributionModal');
        addDistributionForm.reset();
        if (distFamilyField) distFamilyField.style.display = '';
        note.textContent = '';
      }, 1800);
    } catch (err) {
      note.style.color = 'var(--burgundy)';
      note.textContent = 'تعذّر الاتصال بالسيرفر.';
    }
  });
}
