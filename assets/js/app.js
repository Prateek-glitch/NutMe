/**
 * NutMe Frontend Enhanced JS
 * Implements: drag & drop, consent gating, toast system,
 * skeleton randomization, ARIA chips, file meta display, compact mode,
 * sticky bar animation, improved accessibility.
 */

const els = {
  form: document.getElementById('roastForm'),
  photoInput: document.getElementById('photo'),
  dropZone: document.getElementById('dropZone'),
  previewImage: document.getElementById('previewImage'),
  previewPlaceholder: document.getElementById('previewPlaceholder'),
  submitBtn: document.getElementById('submitBtn'),
  regenBtn: document.getElementById('regenBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressBarContainer: document.getElementById('progressBarContainer'),
  progressBar: document.getElementById('progressBar'),
  roastOutput: document.getElementById('roastOutput'),
  resultSection: document.getElementById('resultSection'),
  copyBtn: document.getElementById('copyBtn'),
  userContext: document.getElementById('userContext'),
  intensityGroup: document.getElementById('intensityGroup'),
  tipsDetails: document.getElementById('tipsDetails'),
  modelTag: document.getElementById('modelTag'),
  themeToggle: document.getElementById('themeToggle'),
  consent: document.getElementById('consentBox'),
  toastContainer: document.getElementById('toastContainer'),
  skeletonLoader: document.getElementById('skeletonLoader'),
  collapseTipsBtn: document.getElementById('collapseTipsBtn'),
  stickyBar: document.getElementById('stickyBar'),
  stickyRegen: document.getElementById('stickyRegen'),
  stickyCopy: document.getElementById('stickyCopy'),
  stickyTop: document.getElementById('stickyTop'),
  compactToggle: document.getElementById('compactToggle'),
  uploadMeta: document.getElementById('uploadMeta'),
  liveRegion: document.getElementById('liveRegion')
};
document.getElementById('year').textContent = new Date().getFullYear();

let lastUploadedFile = null;
let lastRequestMeta = null;
let isLoading = false;

const THEME_KEY = 'nutme-theme';
const COMPACT_KEY = 'nutme-compact';

/* ---------- Theme persistence ---------- */
(function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') document.body.classList.add('light');
})();
els.themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
});

/* ---------- Compact mode ---------- */
(function initCompact(){
  const saved = localStorage.getItem(COMPACT_KEY);
  if (saved === '1') {
    document.body.classList.add('compact');
    els.compactToggle?.setAttribute('aria-pressed','true');
    if (els.compactToggle) els.compactToggle.textContent = 'Compact: On';
  }
})();
els.compactToggle?.addEventListener('click', () => {
  const on = document.body.classList.toggle('compact');
  els.compactToggle.setAttribute('aria-pressed', String(on));
  els.compactToggle.textContent = 'Compact: ' + (on ? 'On' : 'Off');
  localStorage.setItem(COMPACT_KEY, on ? '1':'0');
});

/* ---------- Consent gating ---------- */
els.consent.addEventListener('change', () => {
  els.submitBtn.disabled = !els.consent.checked || !lastUploadedFile || isLoading;
});

/* ---------- Intensity helper ---------- */
function getIntensity() {
  const checked = document.querySelector('input[name="intensity"]:checked');
  return checked ? checked.value : 'mild';
}

/* ---------- ARIA chips update ---------- */
function updateChipAria() {
  document.querySelectorAll('#intensityGroup label.intensity-pill').forEach(label => {
    const inp = label.querySelector('input');
    label.setAttribute('aria-selected', inp.checked ? 'true' : 'false');
  });
}
els.intensityGroup.addEventListener('change', updateChipAria);
updateChipAria();

/* ---------- Drag & Drop ---------- */
;['dragenter','dragover'].forEach(evt =>
  els.dropZone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    els.dropZone.classList.add('dragging');
  })
);
;['dragleave','drop'].forEach(evt =>
  els.dropZone.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    if (evt === 'drop') handleDrop(e);
    els.dropZone.classList.remove('dragging');
  })
);
els.dropZone.addEventListener('click', () => els.photoInput.click());
els.dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.photoInput.click();
  }
});

function handleDrop(e) {
  const dt = e.dataTransfer;
  if (!dt || !dt.files || !dt.files.length) return;
  processFile(dt.files[0]);
}

els.photoInput.addEventListener('change', () => {
  const file = els.photoInput.files[0];
  processFile(file);
});

function processFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('Please choose an image file.', 'error');
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    toast('Image too large (max 4MB).', 'error');
    return;
  }
  lastUploadedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    els.previewImage.src = e.target.result;
    els.previewImage.classList.remove('hidden');
    els.previewPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);

  // File meta
  const kb = (file.size / 1024).toFixed(1);
  const type = file.type.replace('image/','').toUpperCase();
  els.uploadMeta.hidden = false;
  els.uploadMeta.textContent = `${kb} KB • ${type}`;
  announce(`Image loaded: ${kb} KB ${type}`);

  if (els.consent.checked) els.submitBtn.disabled = false;
  // Shift focus to chips to encourage intensity selection (if first upload)
  const firstChip = els.intensityGroup.querySelector('input[name="intensity"]');
  firstChip && firstChip.focus({preventScroll:true});
}

/* ---------- Form submit ---------- */
els.form.addEventListener('submit', e => {
  e.preventDefault();
  if (!lastUploadedFile) return toast('Upload an image first.', 'error');
  if (!els.consent.checked) return toast('Please check consent before roasting.', 'error');
  generateRoast(false);
});

/* ---------- Regenerate ---------- */
els.regenBtn.addEventListener('click', () => {
  if (!lastUploadedFile || !lastRequestMeta) return toast('No previous roast to regenerate.', 'error');
  generateRoast(true);
});

/* ---------- Reset ---------- */
els.resetBtn.addEventListener('click', resetAll);

function resetAll() {
  els.form.reset();
  lastUploadedFile = null;
  lastRequestMeta = null;
  els.previewImage.src = '';
  els.previewImage.classList.add('hidden');
  els.previewPlaceholder.classList.remove('hidden');
  els.roastOutput.textContent = '';
  els.resultSection.classList.add('hidden');
  els.modelTag.hidden = true;
  hideStickyBar();
  els.regenBtn.disabled = true;
  els.stickyRegen.disabled = true;
  els.copyBtn.disabled = true;
  els.stickyCopy.disabled = true;
  els.uploadMeta.hidden = true;
  els.submitBtn.disabled = true;
  toast('Reset complete.', 'accent');
  announce('Form reset.');
}

/* ---------- Copy ---------- */
els.copyBtn.addEventListener('click', copyRoast);
els.stickyCopy.addEventListener('click', copyRoast);
function copyRoast() {
  const text = els.roastOutput.textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => { toast('Copied roast to clipboard.', 'accent'); announce('Roast copied.'); })
    .catch(() => toast('Copy failed.', 'error'));
}

/* ---------- Tips toggle ---------- */
els.collapseTipsBtn.addEventListener('click', () => {
  const open = els.tipsDetails.open;
  if (open) {
    els.tipsDetails.open = false;
    els.collapseTipsBtn.textContent = 'Show Tips';
  } else {
    els.tipsDetails.open = true;
    els.collapseTipsBtn.textContent = 'Hide Tips';
  }
});

/* ---------- Loading / Skeleton ---------- */
function setLoading(state) {
  isLoading = state;
  const spinner = els.submitBtn.querySelector('.spinner');
  const sText = els.submitBtn.querySelector('.submit-text');

  if (state) {
    showSkeleton(true);
    els.submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    sText.textContent = 'Thinking...';
    els.regenBtn.disabled = true;
    els.stickyRegen.disabled = true;
  } else {
    spinner.classList.add('hidden');
    sText.textContent = 'Roast Me';
    if (lastRequestMeta) {
      els.regenBtn.disabled = false;
      els.stickyRegen.disabled = false;
    }
    if (els.consent.checked && lastUploadedFile) els.submitBtn.disabled = false;
    showSkeleton(false);
  }
}

/* Random skeleton line widths each time */
function buildSkeleton() {
  els.skeletonLoader.innerHTML = '';
  const lineCount = 4 + Math.floor(Math.random()*3);
  for (let i=0;i<lineCount;i++){
    const span = document.createElement('span');
    const width = 60 + Math.random()*35; // 60% - 95%
    span.style.setProperty('--w', width.toFixed(1)+'%');
    els.skeletonLoader.appendChild(span);
  }
}

function showSkeleton(on) {
  if (on) {
    buildSkeleton();
    els.skeletonLoader.hidden = false;
    els.skeletonLoader.classList.remove('fade-out');
  } else {
    els.skeletonLoader.classList.add('fade-out');
    setTimeout(()=> {
      els.skeletonLoader.hidden = true;
      els.skeletonLoader.classList.remove('fade-out');
    }, 350);
  }
}

/* ---------- Progress Bar ---------- */
function fakeProgress() {
  els.progressBarContainer.classList.remove('hidden');
  els.progressBar.style.width = '0%';
  let p = 0;
  const int = setInterval(() => {
    p += Math.random() * 15;
    if (p >= 90) {
      clearInterval(int);
    } else {
      els.progressBar.style.width = p + '%';
    }
  }, 260);
  return () => {
    els.progressBar.style.width = '100%';
    setTimeout(() => {
      els.progressBarContainer.classList.add('hidden');
      els.progressBar.style.width = '0%';
    }, 650);
  };
}

/* ---------- Sticky bar visibility ---------- */
function showStickyBar() {
  els.stickyBar.classList.add('active');
  els.stickyBar.classList.remove('hidden');
}
function hideStickyBar() {
  els.stickyBar.classList.remove('active');
  setTimeout(()=>els.stickyBar.classList.add('hidden'), 450);
}

/* ---------- Generate Roast ---------- */
async function generateRoast(regen) {
  setLoading(true);
  const endProgress = fakeProgress();
  try {
    const fd = new FormData();
    fd.append('photo', lastUploadedFile);
    fd.append('intensity', getIntensity());
    fd.append('userContext', els.userContext.value || '');
    if (regen && lastRequestMeta) {
      fd.append('regen', '1');
      fd.append('previousPrompt', lastRequestMeta.prompt || '');
    }

    const res = await fetch('roast.php', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const roast = data.roast || '(No response)';
    els.resultSection.classList.remove('hidden');

    // Scroll into view if not mostly visible
    const rect = els.resultSection.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.3) {
      els.resultSection.scrollIntoView({ behavior:'smooth', block:'start' });
    }

    els.roastOutput.textContent = roast;
    lastRequestMeta = data.meta || null;

    // Model tag
    if (data.meta?.model) {
      els.modelTag.hidden = false;
      els.modelTag.textContent = 'Model: ' + data.meta.model;
    } else {
      els.modelTag.hidden = true;
    }

    toast(regen ? 'Regenerated roast.' : 'Roast ready!', 'accent');
    showStickyBar();
    els.copyBtn.disabled = false;
    els.stickyCopy.disabled = false;
    els.regenBtn.disabled = false;
    els.stickyRegen.disabled = false;
    announce(regen ? 'Roast regenerated.' : 'Roast ready.');
  } catch (err) {
    console.error(err);
    els.roastOutput.textContent = 'Error: ' + err.message;
    els.resultSection.classList.remove('hidden');
    toast(err.message, 'error');
    announce('Error generating roast.');
  } finally {
    endProgress();
    setLoading(false);
  }
}

/* ---------- Toast System ---------- */
function toast(message, variant='default', timeout=3200) {
  const div = document.createElement('div');
  div.className = 'toast ' + (variant === 'error' ? 'error' : variant === 'accent' ? 'accent' : '');
  div.innerHTML = `<div>${escapeHtml(message)}</div><button aria-label="Close notification">&times;</button>`;
  const btn = div.querySelector('button');
  btn.addEventListener('click', dismiss);
  els.toastContainer.appendChild(div);
  let to = setTimeout(dismiss, timeout);

  function dismiss() {
    if (!div.isConnected) return;
    div.style.opacity = '0';
    div.style.transform = 'translateY(-4px)';
    setTimeout(() => div.remove(), 180);
    clearTimeout(to);
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[s]));
}

/* ---------- Live region announcements ---------- */
function announce(msg) {
  els.liveRegion.textContent = '';
  // slight delay to ensure screen reader picks change
  setTimeout(()=> els.liveRegion.textContent = msg, 50);
}

/* ---------- Keyboard outline enabling ---------- */
let keyboardUsed = false;
window.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !keyboardUsed) {
    document.body.classList.add('user-tabbed');
    keyboardUsed = true;
  }
});

/* ---------- Intersection reveal (optional) ---------- */
const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach(ent => {
    if (ent.isIntersecting) {
      ent.target.classList.add('reveal-in');
      observer.unobserve(ent.target);
    }
  });
},{ threshold:0.14 }) : null;
document.querySelectorAll('.panel, .panel-sub').forEach(el => {
  el.classList.add('pre-reveal');
  observer && observer.observe(el);
});

/* ---------- Sticky bar hide near top? (optional logic placeholder) ---------- */
// Currently we keep it persistent once a roast appears.

/* ---------- Initial states ---------- */
els.submitBtn.disabled = true;
els.regenBtn.disabled = true;
els.copyBtn.disabled = true;
els.stickyCopy.disabled = true;
els.stickyRegen.disabled = true;

/* ---------- (Optional) Before unload guard ----------
window.addEventListener('beforeunload', e => {
  if (isLoading) {
    e.preventDefault();
    e.returnValue = '';
  }
});
*/