// ============================================================
// ProofPix — app.js
// Frontend SPA logic: routing, auth, upload, verify, dashboard
// ============================================================

const SERVER_ORIGIN = (window.location.protocol === 'file:' || window.location.origin === 'null')
  ? 'http://127.0.0.1:5001'
  : window.location.origin;

const API = `${SERVER_ORIGIN}/api`;

if (window.location.protocol === 'file:') {
  window.location.href = `${SERVER_ORIGIN}/`;
}

// ─── State ───────────────────────────────────────────────────
let currentUser = null;
let selectedFile = null;
let verifySelectedFile = null;

// ─── Helpers ───────────────────────────────────────────────────
async function parseJSONResponse(res) {
  const text = await res.text();
  if (!text) {
    return res.ok ? {} : { error: res.statusText || `HTTP ${res.status}` };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const fallbackText = text.length > 200 ? `${text.slice(0, 200)}...` : text;
    return { error: fallbackText || `Invalid server response (status ${res.status})` };
  }
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  const token = localStorage.getItem('ppToken');
  const user = localStorage.getItem('ppUser');

  if (token && user) {
    currentUser = JSON.parse(user);
    updateNav(true);
  }

  // Handle URL-based routing (for /view/:hash links)
  const path = window.location.pathname;
  if (path.startsWith('/view/')) {
    const hash = path.split('/view/')[1];
    showViewPage(hash);
  } else {
    showPage('landing');
  }

  // Allow Enter key for auth forms
  document.getElementById('loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('signupPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') signup();
  });
});

// ─── SPA Router ───────────────────────────────────────────────
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Page-specific logic
  if (page === 'dashboard') {
    if (!currentUser) { showPage('login'); return; }
    loadDashboard();
  }
  if (page === 'upload' && !currentUser) {
    showToast('Please log in to upload files', 'error');
    showPage('login');
    return;
  }
  if (page === 'upload') {
    resetUploadForm();
  }
  if (page === 'verify') {
    resetVerifyForm();
  }

  // Update URL without reload
  const routes = { landing: '/', login: '/login', signup: '/signup', dashboard: '/dashboard', upload: '/upload', verify: '/verify' };
  if (routes[page]) history.pushState({}, '', routes[page]);

  // Scroll to top
  window.scrollTo(0, 0);
}

// ─── Nav Helpers ──────────────────────────────────────────────
function updateNav(loggedIn) {
  document.getElementById('loginNavBtn').style.display = loggedIn ? 'none' : 'inline-block';
  document.getElementById('logoutNavBtn').style.display = loggedIn ? 'inline-block' : 'none';
  document.getElementById('dashboardNavLink').style.display = loggedIn ? 'inline-block' : 'none';
  document.getElementById('uploadNavBtn').style.display = loggedIn ? 'inline-block' : 'none';
}

function handleDashboardNav() {
  if (currentUser) showPage('dashboard');
  else showPage('login');
}

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ─── AUTH ─────────────────────────────────────────────────────
async function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signupBtn');
  const alert = document.getElementById('signupAlert');

  hideAlert(alert);

  if (!name || !email || !password) {
    showAlert(alert, 'All fields are required.', 'error');
    return;
  }

  btn.textContent = 'Creating account…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await parseJSONResponse(res);

    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    // Save session
    localStorage.setItem('ppToken', data.token);
    localStorage.setItem('ppUser', JSON.stringify(data.user));
    currentUser = data.user;
    updateNav(true);
    showToast('Account created! Welcome to ProofPix 🎉', 'success');
    showPage('dashboard');
  } catch (err) {
    showAlert(alert, err.message, 'error');
  } finally {
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const alert = document.getElementById('loginAlert');

  hideAlert(alert);

  if (!email || !password) {
    showAlert(alert, 'Please enter email and password.', 'error');
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await parseJSONResponse(res);

    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    localStorage.setItem('ppToken', data.token);
    localStorage.setItem('ppUser', JSON.stringify(data.user));
    currentUser = data.user;
    updateNav(true);
    showToast('Welcome back! 👋', 'success');
    showPage('dashboard');
  } catch (err) {
    showAlert(alert, err.message, 'error');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('ppToken');
  localStorage.removeItem('ppUser');
  currentUser = null;
  updateNav(false);
  showToast('Logged out successfully', 'success');
  showPage('landing');
}

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  const loading = document.getElementById('dashboardLoading');
  const empty = document.getElementById('dashboardEmpty');
  const grid = document.getElementById('filesGrid');

  loading.style.display = 'flex';
  empty.style.display = 'none';
  grid.style.display = 'none';

  try {
    const res = await fetch(`${API}/files/my-files`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('ppToken')}` }
    });
    const data = await parseJSONResponse(res);

    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    loading.style.display = 'none';

    if (!data.files || data.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = data.files.map(file => renderFileCard(file)).join('');

  } catch (err) {
    loading.style.display = 'none';
    showToast('Failed to load files: ' + err.message, 'error');
  }
}

function renderFileCard(file) {
  const shareUrl = `${window.location.origin}/view/${file.hash}`;
  const isImage = file.fileType === 'image';
  const date = new Date(file.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const shortHash = file.hash.substring(0, 8) + '...' + file.hash.substring(56);

  const thumbHtml = isImage
    ? `<img src="${API}/files/view/${file.hash}" alt="${file.originalName}" loading="lazy" />`
    : `<div class="thumb-placeholder">🎬</div>`;

  return `
    <div class="file-card" id="card-${file._id}">
      <div class="file-card-thumb">${thumbHtml}</div>
      <div class="file-card-body">
        <div class="file-card-name" title="${file.originalName}">${file.originalName}</div>
        <div class="file-card-hash"># ${shortHash}</div>
        <div class="file-card-date">📅 ${date} · ${formatBytes(file.size)}</div>
        <div class="file-card-actions">
          <button class="btn-sm" onclick="openShareModal('${shareUrl}')">🔗 Share</button>
          <button class="btn-sm" onclick="viewFile('${file.hash}')">👁 View</button>
          <button class="btn-danger" onclick="deleteFile('${file._id}')">✕ Delete</button>
        </div>
      </div>
    </div>
  `;
}

function viewFile(hash) {
  showViewPage(hash);
}

async function deleteFile(id) {
  if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;

  try {
    const res = await fetch(`${API}/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('ppToken')}` }
    });
    const data = await parseJSONResponse(res);

    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    // Remove card from UI
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();

    // Check if grid is now empty
    const grid = document.getElementById('filesGrid');
    if (grid.children.length === 0) {
      grid.style.display = 'none';
      document.getElementById('dashboardEmpty').style.display = 'flex';
    }

    showToast('File deleted successfully', 'success');
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ─── VIEW PAGE ────────────────────────────────────────────────
async function showViewPage(hash) {
  // Show the view page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-view').classList.add('active');

  const loading = document.getElementById('viewLoading');
  const content = document.getElementById('viewContent');
  const error = document.getElementById('viewError');

  loading.style.display = 'flex';
  content.style.display = 'none';
  error.style.display = 'none';

  history.pushState({}, '', `/view/${hash}`);

  try {
    // Fetch metadata
    const metaRes = await fetch(`${API}/files/view-meta/${hash}`);
    if (!metaRes.ok) throw new Error('Not found');
    const meta = await metaRes.json();

    loading.style.display = 'none';
    content.style.display = 'block';

    // Set metadata
    document.getElementById('viewOwner').textContent = meta.ownerName;
    document.getElementById('viewDate').textContent = new Date(meta.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('viewFilename').textContent = meta.originalName;
    document.getElementById('viewHash').textContent = meta.hash;

    // Show media
    const imgEl = document.getElementById('viewImage');
    const vidEl = document.getElementById('viewVideo');

    if (meta.fileType === 'image') {
      imgEl.src = `${API}/files/view/${hash}`;
      imgEl.style.display = 'block';
      vidEl.style.display = 'none';
    } else {
      vidEl.src = `${API}/files/view/${hash}`;
      vidEl.style.display = 'block';
      imgEl.style.display = 'none';
    }

  } catch (err) {
    loading.style.display = 'none';
    error.style.display = 'flex';
  }
}

// ─── UPLOAD ───────────────────────────────────────────────────
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) setSelectedFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setSelectedFile(file);
}

function setSelectedFile(file) {
  selectedFile = file;
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    showToast('Only images and videos are allowed!', 'error');
    return;
  }

  document.getElementById('previewIcon').textContent = isImage ? '🖼️' : '🎬';
  document.getElementById('previewName').textContent = file.name;
  document.getElementById('previewSize').textContent = formatBytes(file.size) + ' · ' + file.type;
  document.getElementById('filePreview').style.display = 'block';
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('uploadBtn').disabled = false;
}

function clearFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('dropZone').style.display = 'block';
  document.getElementById('uploadBtn').disabled = true;
}

function resetUploadForm() {
  clearFile();
  document.getElementById('uploadResult').style.display = 'none';
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('uploadCard').style.display = 'flex';
  resetProgressSteps();
}

async function uploadFile() {
  if (!selectedFile) return;
  if (!currentUser) { showPage('login'); return; }

  const btn = document.getElementById('uploadBtn');
  const progressSection = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');

  btn.disabled = true;
  btn.textContent = 'Processing…';
  progressSection.style.display = 'block';

  // Animate progress steps
  await animateStep('step1', 20);
  await animateStep('step2', 50);
  await animateStep('step3', 75);

  const formData = new FormData();
  formData.append('file', selectedFile);

  try {
    const res = await fetch(`${API}/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('ppToken')}` },
      body: formData
    });
    const data = await parseJSONResponse(res);

    await animateStep('step4', 100);
    await sleep(300);

    progressSection.style.display = 'none';
    document.getElementById('uploadCard').style.display = 'none';

    const resultDiv = document.getElementById('uploadResult');
    resultDiv.style.display = 'block';

    if (res.status === 409) {
      // Duplicate detected
      resultDiv.innerHTML = `
        <div class="upload-error">
          <h3>⚠️ Duplicate Detected</h3>
          <p>${data.message}</p>
          <p style="margin-top: 8px; font-size:0.85rem; color: var(--text-muted);">
            Already registered by: <strong style="color:var(--text)">${data.existingOwner}</strong>
          </p>
        </div>
        <button class="btn-primary" onclick="resetUploadForm(); document.getElementById('uploadCard').style.display='flex';">Upload Another</button>
      `;
    } else if (!res.ok) {
      throw new Error(data.error || `${res.status} ${res.statusText}`);
    } else {
      const shareUrl = `${window.location.origin}/view/${data.media.hash}`;
      resultDiv.innerHTML = `
        <div class="upload-success">
          <h3>✓ File Protected Successfully!</h3>
          <div class="result-row">
            <span class="result-key">File</span>
            <span class="result-val">${data.media.originalName}</span>
          </div>
          <div class="result-row">
            <span class="result-key">SHA-256</span>
            <span class="result-val">${data.media.hash}</span>
          </div>
          <div class="result-row">
            <span class="result-key">Type</span>
            <span class="result-val">${data.media.fileType}</span>
          </div>
          <div class="result-row">
            <span class="result-key">Size</span>
            <span class="result-val">${formatBytes(data.media.size)}</span>
          </div>
          <div style="margin-top: 14px; font-size: 0.8rem; color: var(--text-dim)">Share link:</div>
          <div class="share-link-box">
            <span>${shareUrl}</span>
            <button class="btn-sm" onclick="copyText('${shareUrl}')">Copy</button>
          </div>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn-primary" onclick="showPage('dashboard')">View Dashboard</button>
          <button class="btn-outline" onclick="resetUploadForm(); document.getElementById('uploadCard').style.display='flex';">Upload Another</button>
        </div>
      `;
      showToast('File protected! 🔒', 'success');
    }
  } catch (err) {
    progressSection.style.display = 'none';
    document.getElementById('uploadCard').style.display = 'flex';
    resetProgressSteps();
    btn.disabled = false;
    btn.textContent = 'Protect This File →';
    showToast('Upload failed: ' + err.message, 'error');
  }
}

async function animateStep(stepId, progress) {
  const step = document.getElementById(stepId);
  const bar = document.getElementById('progressBar');

  // Mark previous steps done
  const steps = ['step1', 'step2', 'step3', 'step4'];
  const idx = steps.indexOf(stepId);
  for (let i = 0; i < idx; i++) {
    const prev = document.getElementById(steps[i]);
    prev.classList.remove('active');
    prev.classList.add('done');
    prev.querySelector('span').textContent = '✓';
  }

  step.classList.add('active');
  bar.style.width = progress + '%';
  await sleep(600);
}

function resetProgressSteps() {
  ['step1', 'step2', 'step3', 'step4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    el.querySelector('span').textContent = i + 1;
  });
  document.getElementById('progressBar').style.width = '0%';
}

// ─── VERIFY ───────────────────────────────────────────────────
function handleVerifySelect(e) {
  const file = e.target.files[0];
  if (file) setVerifyFile(file);
}

function handleVerifyDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setVerifyFile(file);
}

function setVerifyFile(file) {
  verifySelectedFile = file;
  document.getElementById('verifyFileName').textContent = file.name;
  document.getElementById('verifyFileSize').textContent = formatBytes(file.size);
  document.getElementById('verifyPreview').style.display = 'block';
  document.getElementById('verifyDropZone').style.display = 'none';
  document.getElementById('verifyBtn').disabled = false;
}

function clearVerifyFile() {
  verifySelectedFile = null;
  document.getElementById('verifyInput').value = '';
  document.getElementById('verifyPreview').style.display = 'none';
  document.getElementById('verifyDropZone').style.display = 'block';
  document.getElementById('verifyBtn').disabled = true;
}

function resetVerifyForm() {
  clearVerifyFile();
  document.getElementById('verifyResult').style.display = 'none';
}

async function verifyFile() {
  if (!verifySelectedFile) return;

  const btn = document.getElementById('verifyBtn');
  btn.textContent = 'Checking…';
  btn.disabled = true;

  const formData = new FormData();
  formData.append('file', verifySelectedFile);

  try {
    const res = await fetch(`${API}/verify`, {
      method: 'POST',
      body: formData
    });
    const data = await parseJSONResponse(res);

    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);

    const resultDiv = document.getElementById('verifyResult');
    resultDiv.style.display = 'block';

    if (data.verified) {
      const date = new Date(data.result.registeredAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const shareUrl = `${window.location.origin}${data.result.shareUrl}`;

      resultDiv.innerHTML = `
        <div class="verify-success">
          <h3>✓ Verified — Registered Content</h3>
          <div class="result-row">
            <span class="result-key">Owner</span>
            <span class="result-val">${data.result.ownerName}</span>
          </div>
          <div class="result-row">
            <span class="result-key">File</span>
            <span class="result-val">${data.result.originalName}</span>
          </div>
          <div class="result-row">
            <span class="result-key">Registered</span>
            <span class="result-val">${date}</span>
          </div>
          <div class="result-row">
            <span class="result-key">SHA-256</span>
            <span class="result-val" style="font-family:var(--font-mono);font-size:0.75rem">${data.result.hash}</span>
          </div>
          <div style="margin-top:16px">
            <button class="btn-primary" onclick="showViewPage('${data.result.hash}')">View Certificate →</button>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="verify-fail">
          <h3>✕ Not Registered</h3>
          <p>This file has no ownership record in ProofPix.</p>
          <p style="margin-top:8px;font-size:0.8rem;color:var(--text-muted)">Hash: <span style="font-family:var(--font-mono)">${data.hash || ''}</span></p>
        </div>
      `;
    }

  } catch (err) {
    showToast('Verification failed: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Check Ownership →';
    btn.disabled = false;
  }
}

// ─── SHARE MODAL ──────────────────────────────────────────────
function openShareModal(url) {
  document.getElementById('shareLinkInput').value = url;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  copyText(input.value);
}

// ─── UTILS ────────────────────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Copied!', 'success');
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

function showAlert(el, message, type) {
  el.textContent = message;
  el.className = `alert ${type}`;
  el.style.display = 'block';
}

function hideAlert(el) {
  el.style.display = 'none';
}
