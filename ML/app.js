(function () {
  const STORAGE_KODLAR = 'ml_kodListesi';
  const STORAGE_MAKINELER = 'ml_makineler';

  let kodlar = [];
  let makineler = [];
  let aktifMakineId = null;
  let kodEditKod = null;
  let makineSeciliKodlar = new Set();
  let kayitlarDirHandle = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function toast(msg, type) {
    type = type || 'success';
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.add('hidden'); }, 3200);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str != null ? str : '';
    return d.innerHTML;
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function safeFileName(seriNo) {
    return String(seriNo).replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
  }

  function loadStorage() {
    try {
      kodlar = JSON.parse(localStorage.getItem(STORAGE_KODLAR)) || [];
      makineler = JSON.parse(localStorage.getItem(STORAGE_MAKINELER)) || [];
    } catch (e) {
      kodlar = [];
      makineler = [];
    }
  }

  function saveStorage() {
    localStorage.setItem(STORAGE_KODLAR, JSON.stringify(kodlar));
    localStorage.setItem(STORAGE_MAKINELER, JSON.stringify(makineler));
  }

  function saveKodlarJson() {
    downloadFile(JSON.stringify({ kodlar: kodlar }, null, 2), 'kodlar.json', 'application/json');
    toast('kodlar.json indirildi — kayitlar klasörüne kaydedin');
  }

  function updateCsvBanner() {
    const el = $('#csvBanner');
    if (el) el.classList.toggle('hidden', kodlar.length > 0);
  }

  function pickCsv() {
    $('#csvHeaderInput').click();
  }

  function saveMakineJson(makine) {
    downloadFile(JSON.stringify(makine, null, 2), safeFileName(makine.seriNo), 'application/json');
  }

  function canUseFolderApi() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function openIdb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open('ml-kayitlar', 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore('store');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbSet(key, val) {
    return openIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('store', 'readwrite');
        tx.objectStore('store').put(val, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(key) {
    return openIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('store', 'readonly');
        const req = tx.objectStore('store').get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function updateKlasorDurum() {
    const el = $('#klasorDurum');
    if (!el) return;
    if (kayitlarDirHandle) {
      el.textContent = 'kayitlar bağlı';
      el.className = 'klasor-durum bagli';
      el.title = 'Kaydet dediğinizde JSON otomatik kayitlar klasörüne yazılır';
    } else if (canUseFolderApi()) {
      el.textContent = 'klasör bağlı değil';
      el.className = 'klasor-durum';
      el.title = 'kayitlar Bağla ile proje klasörünü seçin';
    } else {
      el.textContent = 'manuel JSON';
      el.className = 'klasor-durum';
      el.title = 'Bu tarayıcıda otomatik kayıt yok — JSON İndir kullanın';
    }
  }

  async function verifyDirPermission(handle, write) {
    const opts = { mode: write ? 'readwrite' : 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async function writeJsonToFolder(filename, data) {
    if (!kayitlarDirHandle) return false;
    if (!(await verifyDirPermission(kayitlarDirHandle, true))) return false;
    const fh = await kayitlarDirHandle.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    await w.close();
    return true;
  }

  async function saveMakineToFolder(makine) {
    return writeJsonToFolder(safeFileName(makine.seriNo), makine);
  }

  async function saveKodlarToFolder() {
    return writeJsonToFolder('kodlar.json', { kodlar: kodlar });
  }

  async function baglaKayitlarKlasoru() {
    if (!canUseFolderApi()) {
      toast('Bu tarayıcı klasöre yazmayı desteklemiyor — JSON İndir kullanın', 'error');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      kayitlarDirHandle = handle;
      await idbSet('kayitlarDir', handle);
      updateKlasorDurum();
      toast('kayitlar klasörü bağlandı — Kaydet artık JSON yazar');
    } catch (e) {
      if (e.name !== 'AbortError') toast('Klasör bağlanamadı', 'error');
    }
  }

  async function initKayitlarKlasoru() {
    if (!canUseFolderApi()) {
      updateKlasorDurum();
      return;
    }
    try {
      const handle = await idbGet('kayitlarDir');
      if (handle && (await verifyDirPermission(handle, true))) {
        kayitlarDirHandle = handle;
      }
    } catch (e) { /* ignore */ }
    updateKlasorDurum();
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 2) continue;
      const kod = parts[0].trim();
      const aciklama = parts.slice(1).join(';').trim();
      if (!kod) continue;
      if (i === 0 && /^kod$/i.test(kod)) continue;
      result.push({ kod: kod, aciklama: aciklama });
    }
    return result;
  }

  function normalizeKod(k) {
    return k.trim().toUpperCase();
  }

  function extractSeri(kod) {
    const m = kod.match(/^([A-Za-z]+)\d/);
    return m ? m[1].toUpperCase() : kod.toUpperCase();
  }

  function getSeriler(list) {
    list = list || kodlar;
    const counts = new Map();
    list.forEach(function (item) {
      const seri = extractSeri(item.kod);
      counts.set(seri, (counts.get(seri) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(function (a, b) { return a[0].localeCompare(b[0], 'tr'); })
      .map(function (e) { return { seri: e[0], count: e[1] }; });
  }

  function normalizeAciklama(text) {
    return text.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
  }

  function aciklamaEslesir(aciklama, query) {
    const q = normalizeAciklama(query.trim());
    if (!q) return true;
    const normalized = normalizeAciklama(aciklama);
    return q.split(/\s+/).filter(Boolean).every(function (w) { return normalized.includes(w); });
  }

  function kodSeriEslesir(kod, query) {
    const q = normalizeKod(query);
    if (!q) return true;
    return normalizeKod(kod).startsWith(q);
  }

  function getMakineFiltre() {
    return { seri: ($('#kodSeriFilter') && $('#kodSeriFilter').value) || '', aciklama: ($('#kodAciklamaFilter') && $('#kodAciklamaFilter').value) || '' };
  }

  function getListeFiltre() {
    return { seri: ($('#kodListeSeriFilter') && $('#kodListeSeriFilter').value) || '', aciklama: ($('#kodListeAciklamaFilter') && $('#kodListeAciklamaFilter').value) || '' };
  }

  function filterKodlar(items, filtre) {
    filtre = filtre || {};
    return items.filter(function (k) {
      return kodSeriEslesir(k.kod, filtre.seri || '') && aciklamaEslesir(k.aciklama, filtre.aciklama || '');
    });
  }

  function highlightKod(kod, seriQuery) {
    const q = normalizeKod(seriQuery);
    if (!q || !normalizeKod(kod).startsWith(q)) return esc(kod);
    return '<mark>' + esc(kod.slice(0, q.length)) + '</mark>' + esc(kod.slice(q.length));
  }

  function highlightAciklama(aciklama, query) {
    const q = query.trim();
    if (!q) return esc(aciklama);
    let result = esc(aciklama);
    q.split(/\s+/).filter(Boolean).forEach(function (word) {
      const re = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    });
    return result;
  }

  function renderSeriChips(containerId, activeSeri, onSelect) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = getSeriler().map(function (_ref) {
      const seri = _ref.seri, count = _ref.count;
      return '<button type="button" class="seri-chip ' + (activeSeri === seri ? 'active' : '') + '" data-seri="' + esc(seri) + '" title="' + count + ' kod">' + esc(seri) + ' <span style="opacity:0.7;font-weight:400">' + count + '</span></button>';
    }).join('');
    el.querySelectorAll('.seri-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { onSelect(chip.dataset.seri); });
    });
  }

  function tabSwitch(name) {
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    $$('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + name); });
  }

  function renderMakineListesi(filter) {
    filter = filter || '';
    const list = $('#makineListesi');
    const q = filter.toLowerCase().trim();
    const filtered = makineler.filter(function (m) {
      if (!q) return true;
      return [m.seriNo, m.firma, m.model].some(function (v) { return v.toLowerCase().includes(q); });
    });

    if (!filtered.length) {
      list.innerHTML = '<li style="padding:1rem;color:var(--text-muted);font-size:0.85rem;">Kayıt yok — Kayıtları Yükle ile kayitlar klasörünü seçin</li>';
      return;
    }

    list.innerHTML = filtered.sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }).map(function (m) {
      return '<li><button type="button" class="' + (m.id === aktifMakineId ? 'active' : '') + '" data-id="' + m.id + '">' +
        '<div class="item-title">' + esc(m.seriNo) + '</div>' +
        '<div class="item-meta">' + esc(m.firma) + ' · ' + esc(m.model) + '</div>' +
        '<span class="item-kod-count">' + m.kodlar.length + ' kod</span></button></li>';
    }).join('');

    list.querySelectorAll('button[data-id]').forEach(function (btn) {
      btn.addEventListener('click', function () { openMakine(btn.dataset.id); });
    });
  }

  function setMakineSecim(kodList) {
    makineSeciliKodlar = new Set(kodList || []);
  }

  function getSeciliKodlar() {
    return Array.from(makineSeciliKodlar);
  }

  function updateSeciliSayisi() {
    $('#seciliKodSayisi').textContent = makineSeciliKodlar.size + ' seçili';
  }

  function getFilteredKodlar() {
    const sorted = kodlar.slice().sort(function (a, b) { return a.kod.localeCompare(b.kod, 'tr'); });
    return filterKodlar(sorted, getMakineFiltre());
  }

  function renderKodCheckboxes(scrollTop) {
    const wrap = $('#kodCheckboxList');
    const filtre = getMakineFiltre();
    const sorted = kodlar.slice().sort(function (a, b) { return a.kod.localeCompare(b.kod, 'tr'); });
    const filtered = filterKodlar(sorted, filtre);
    const secili = sorted.filter(function (k) { return makineSeciliKodlar.has(k.kod); });
    const diger = filtered.filter(function (k) { return !makineSeciliKodlar.has(k.kod); });
    const activeSeri = normalizeKod(filtre.seri);

    renderSeriChips('#seriChipsMakine', extractSeri(activeSeri) === activeSeri && activeSeri ? activeSeri : '', function (seri) {
      const current = normalizeKod($('#kodSeriFilter').value);
      $('#kodSeriFilter').value = current === seri ? '' : seri;
      refreshKodCheckboxes(false);
    });

    $('#kodFiltreSonuc').textContent = filtre.seri || filtre.aciklama
      ? makineSeciliKodlar.size + ' seçili · ' + filtered.length + ' kod gösteriliyor'
      : makineSeciliKodlar.size + ' seçili · tüm kodlar (' + kodlar.length + ')';

    if (!secili.length && !diger.length) {
      wrap.innerHTML = '<p style="padding:1rem;color:var(--text-muted);">Filtreye uygun kod bulunamadı</p>';
      updateSeciliSayisi();
      return;
    }

    function rowHtml(k, isSelected) {
      return '<label class="kod-checkbox-item' + (isSelected ? ' is-selected' : '') + '"><input type="checkbox" value="' + esc(k.kod) + '" ' + (isSelected ? 'checked' : '') + '>' +
        '<span class="kod-label">' + highlightKod(k.kod, filtre.seri) + '</span>' +
        '<span class="kod-desc">' + highlightAciklama(k.aciklama, filtre.aciklama) + '</span></label>';
    }

    let html = '';
    if (secili.length) {
      html += '<div class="kod-group-label">Seçili kodlar (' + secili.length + ')</div>';
      html += secili.map(function (k) { return rowHtml(k, true); }).join('');
    }
    if (diger.length) {
      html += '<div class="kod-group-label">' + (secili.length ? 'Diğer kodlar' : 'Tüm kodlar') + ' (' + diger.length + ')</div>';
      html += diger.map(function (k) { return rowHtml(k, false); }).join('');
    }
    wrap.innerHTML = html;

    wrap.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) makineSeciliKodlar.add(cb.value);
        else makineSeciliKodlar.delete(cb.value);
        updateSeciliSayisi();
      });
    });
    if (scrollTop !== false) wrap.scrollTop = 0;
    updateSeciliSayisi();
  }

  function refreshKodCheckboxes(resetScroll) {
    renderKodCheckboxes(resetScroll);
  }

  function showMakineForm(show) {
    $('#makineFormWrap').classList.toggle('hidden', !show);
    $('#makineBos').classList.toggle('hidden', show);
  }

  function openMakine(id) {
    aktifMakineId = id;
    const m = makineler.find(function (x) { return x.id === id; });
    if (!m) return;
    $('#makineFormBaslik').textContent = 'Makine Düzenle';
    $('#seriNo').value = m.seriNo;
    $('#firma').value = m.firma;
    $('#model').value = m.model;
    $('#btnMakineSil').hidden = false;
    $('#btnMakineJson').hidden = false;
    $('#kodSeriFilter').value = '';
    $('#kodAciklamaFilter').value = '';
    setMakineSecim(m.kodlar);
    renderKodCheckboxes();
    showMakineForm(true);
    renderMakineListesi($('#makineArama').value);
  }

  function yeniMakine() {
    aktifMakineId = null;
    $('#makineFormBaslik').textContent = 'Yeni Makine';
    $('#makineForm').reset();
    $('#btnMakineSil').hidden = true;
    $('#btnMakineJson').hidden = true;
    $('#kodSeriFilter').value = '';
    $('#kodAciklamaFilter').value = '';
    setMakineSecim([]);
    renderKodCheckboxes();
    showMakineForm(true);
    renderMakineListesi($('#makineArama').value);
  }

  async function kaydetMakine(e) {
    e.preventDefault();
    const seriNo = $('#seriNo').value.trim();
    const firma = $('#firma').value.trim();
    const model = $('#model').value.trim();
    const seciliKodlar = getSeciliKodlar();
    const now = new Date().toISOString();

    if (!seriNo || !firma || !model) {
      toast('Tüm alanları doldurun', 'error');
      return;
    }

    const duplicate = makineler.find(function (m) {
      return m.seriNo.toLowerCase() === seriNo.toLowerCase() && m.id !== aktifMakineId;
    });
    if (duplicate) {
      toast('Bu seri numarası zaten kayıtlı', 'error');
      return;
    }

    let makine;
    const isEdit = !!aktifMakineId;
    if (aktifMakineId) {
      makine = makineler.find(function (x) { return x.id === aktifMakineId; });
      Object.assign(makine, { seriNo: seriNo, firma: firma, model: model, kodlar: seciliKodlar, updatedAt: now });
    } else {
      makine = { id: uid(), seriNo: seriNo, firma: firma, model: model, kodlar: seciliKodlar, createdAt: now, updatedAt: now };
      makineler.push(makine);
      aktifMakineId = makine.id;
      $('#btnMakineSil').hidden = false;
      $('#btnMakineJson').hidden = false;
      $('#makineFormBaslik').textContent = 'Makine Düzenle';
    }

    saveStorage();
    setMakineSecim(makine.kodlar);
    renderMakineListesi($('#makineArama').value);

    let msg = (isEdit ? 'Makine güncellendi' : 'Makine kaydedildi') + ' — ' + makine.kodlar.length + ' kod';
    if (kayitlarDirHandle) {
      try {
        if (await saveMakineToFolder(makine)) msg += ' · kayitlar/ kaydedildi';
        else msg += ' · klasör yazılamadı';
      } catch (err) {
        msg += ' · klasör hatası';
      }
    } else {
      msg += ' · JSON İndir ile kayitlar/ klasörüne alabilirsiniz';
    }
    toast(msg);
  }

  function silMakine() {
    if (!aktifMakineId) return;
    const m = makineler.find(function (x) { return x.id === aktifMakineId; });
    if (!confirm('"' + m.seriNo + '" kaydını silmek istediğinize emin misiniz?\n\nkayitlar/' + safeFileName(m.seriNo) + ' dosyasını klasörden de silin.')) return;
    makineler = makineler.filter(function (x) { return x.id !== aktifMakineId; });
    aktifMakineId = null;
    saveStorage();
    showMakineForm(false);
    renderMakineListesi($('#makineArama').value);
    toast('Makine silindi');
  }

  function renderKodTable() {
    const tbody = $('#kodTableBody');
    const filtre = getListeFiltre();
    const sorted = kodlar.slice().sort(function (a, b) { return a.kod.localeCompare(b.kod, 'tr'); });
    const filtered = filterKodlar(sorted, filtre);
    const activeSeri = normalizeKod(filtre.seri);

    renderSeriChips('#seriChipsListe', extractSeri(activeSeri) === activeSeri && activeSeri ? activeSeri : '', function (seri) {
      const current = normalizeKod($('#kodListeSeriFilter').value);
      $('#kodListeSeriFilter').value = current === seri ? '' : seri;
      renderKodTable();
    });

    $('#kodListeFiltreSonuc').textContent = filtre.seri || filtre.aciklama
      ? filtered.length + ' kod gösteriliyor (toplam ' + kodlar.length + ')'
      : kodlar.length + ' kod';

    tbody.innerHTML = filtered.length ? filtered.map(function (k) {
      return '<tr><td><strong>' + highlightKod(k.kod, filtre.seri) + '</strong></td><td>' + highlightAciklama(k.aciklama, filtre.aciklama) + '</td>' +
        '<td class="col-actions"><button type="button" class="btn-icon" data-edit="' + esc(k.kod) + '">Düzenle</button>' +
        '<button type="button" class="btn-icon danger" data-del="' + esc(k.kod) + '">Sil</button></td></tr>';
    }).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:1.5rem">Filtreye uygun kod bulunamadı</td></tr>';

    $('#kodToplam').textContent = filtered.length + ' / ' + kodlar.length + ' kod listeleniyor';

    tbody.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () { editKod(btn.dataset.edit); });
    });
    tbody.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteKod(btn.dataset.del); });
    });
  }

  function resetKodForm() {
    kodEditKod = null;
    $('#kodForm').reset();
    $('#btnKodKaydet').textContent = 'Ekle';
    $('#btnKodIptal').hidden = true;
    $('#kodInput').disabled = false;
  }

  function editKod(kod) {
    const item = kodlar.find(function (k) { return k.kod === kod; });
    if (!item) return;
    kodEditKod = kod;
    $('#kodInput').value = item.kod;
    $('#aciklamaInput').value = item.aciklama;
    $('#kodInput').disabled = true;
    $('#btnKodKaydet').textContent = 'Güncelle';
    $('#btnKodIptal').hidden = false;
  }

  function kaydetKod(e) {
    e.preventDefault();
    const kod = normalizeKod($('#kodInput').value);
    const aciklama = $('#aciklamaInput').value.trim();
    if (!kod || !aciklama) {
      toast('Kod ve açıklama gerekli', 'error');
      return;
    }
    if (!kodEditKod && kodlar.some(function (k) { return k.kod === kod; })) {
      toast('Bu kod zaten var', 'error');
      return;
    }
    if (kodEditKod) {
      kodlar.find(function (k) { return k.kod === kodEditKod; }).aciklama = aciklama;
      toast('Kod güncellendi');
    } else {
      kodlar.push({ kod: kod, aciklama: aciklama });
      toast('Kod eklendi');
    }
    saveStorage();
    resetKodForm();
    renderKodTable();
    updateCsvBanner();
    if (aktifMakineId) refreshKodCheckboxes();
  }

  function deleteKod(kod) {
    const item = kodlar.find(function (k) { return k.kod === kod; });
    if (!confirm('"' + kod + ' - ' + item.aciklama + '" kodunu silmek istediğinize emin misiniz?')) return;
    kodlar = kodlar.filter(function (k) { return k.kod !== kod; });
    makineler.forEach(function (m) {
      m.kodlar = m.kodlar.filter(function (k) { return k !== kod; });
    });
    saveStorage();
    renderKodTable();
    updateCsvBanner();
    if (aktifMakineId) refreshKodCheckboxes();
    toast('Kod silindi');
  }

  function importCsv(file) {
    const reader = new FileReader();
    reader.onload = function (ev) {
      const parsed = parseCsv(ev.target.result);
      if (!parsed.length) {
        toast('CSV okunamadı', 'error');
        return;
      }
      let added = 0, updated = 0;
      parsed.forEach(function (_ref) {
        const nk = normalizeKod(_ref.kod);
        const aciklama = _ref.aciklama.trim();
        const existing = kodlar.find(function (k) { return k.kod === nk && k.aciklama === aciklama; });
        if (existing) { updated++; }
        else { kodlar.push({ kod: nk, aciklama: aciklama }); added++; }
      });
      saveStorage();
      renderKodTable();
      updateCsvBanner();
      if (aktifMakineId) refreshKodCheckboxes();
      toast('CSV: ' + added + ' yeni, ' + updated + ' güncellendi — ' + kodlar.length + ' kod');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function exportCsv() {
    const header = 'KOD;AÇIKLAMA';
    const rows = kodlar.slice().sort(function (a, b) { return a.kod.localeCompare(b.kod, 'tr'); }).map(function (k) {
      return k.kod + ';' + k.aciklama;
    });
    downloadFile('\uFEFF' + [header].concat(rows).join('\n'), 'KODListesi.csv', 'text/csv;charset=utf-8');
    toast('CSV indirildi');
  }

  function loadFromFolder(files) {
    const jsonFiles = Array.from(files).filter(function (f) { return f.name.endsWith('.json'); });
    if (!jsonFiles.length) {
      toast('JSON dosyası bulunamadı', 'error');
      return;
    }

    let loadedMakineler = [];
    let loadedKodlar = null;
    let pending = jsonFiles.length;

    jsonFiles.forEach(function (file) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        try {
          const data = JSON.parse(ev.target.result);
          if (file.name === 'kodlar.json') {
            loadedKodlar = data.kodlar || data;
          } else if (data.seriNo) {
            loadedMakineler.push(data);
          }
        } catch (e) { /* skip invalid */ }
        pending--;
        if (pending === 0) finishLoad();
      };
      reader.readAsText(file, 'UTF-8');
    });

    function finishLoad() {
      if (loadedKodlar) kodlar = loadedKodlar;
      loadedMakineler.forEach(function (loaded) {
        const idx = makineler.findIndex(function (m) {
          return m.seriNo.toLowerCase() === loaded.seriNo.toLowerCase();
        });
        if (idx >= 0) makineler[idx] = loaded;
        else makineler.push(loaded);
      });
      saveStorage();
      aktifMakineId = null;
      showMakineForm(false);
      renderMakineListesi();
      renderKodTable();
      updateCsvBanner();
      toast(loadedMakineler.length + ' makine yüklendi' + (loadedKodlar ? ', ' + kodlar.length + ' kod yüklendi' : ''));
    }
  }

  function loadKodlarJson(file) {
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        kodlar = data.kodlar || data;
        saveStorage();
        renderKodTable();
        updateCsvBanner();
        if (aktifMakineId) refreshKodCheckboxes();
        toast(kodlar.length + ' kod yüklendi');
      } catch (e) {
        toast('Geçersiz JSON', 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function bindCsvInput(inputId) {
    const input = $(inputId);
    if (!input) return;
    input.addEventListener('change', function (e) {
      if (e.target.files[0]) importCsv(e.target.files[0]);
      e.target.value = '';
    });
  }

  function bindEvents() {
    $$('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () { tabSwitch(tab.dataset.tab); });
    });

    $('#btnYeniMakine').addEventListener('click', yeniMakine);
    $('#makineForm').addEventListener('submit', kaydetMakine);
    $('#btnMakineIptal').addEventListener('click', function () {
      aktifMakineId = null;
      showMakineForm(false);
      renderMakineListesi($('#makineArama').value);
    });
    $('#btnMakineSil').addEventListener('click', silMakine);
    $('#btnMakineJson').addEventListener('click', function () {
      const m = makineler.find(function (x) { return x.id === aktifMakineId; });
      if (m) { saveMakineJson(m); toast('JSON indirildi'); }
    });
    $('#makineArama').addEventListener('input', function (e) { renderMakineListesi(e.target.value); });
    $('#kodSeriFilter').addEventListener('input', function () { refreshKodCheckboxes(false); });
    $('#kodAciklamaFilter').addEventListener('input', function () { refreshKodCheckboxes(false); });
    $('#btnFiltreTemizle').addEventListener('click', function () {
      $('#kodSeriFilter').value = '';
      $('#kodAciklamaFilter').value = '';
      refreshKodCheckboxes(false);
    });
    $('#btnTumunuSec').addEventListener('click', function () {
      getFilteredKodlar().forEach(function (k) { makineSeciliKodlar.add(k.kod); });
      refreshKodCheckboxes(false);
    });
    $('#btnTemizle').addEventListener('click', function () {
      makineSeciliKodlar.clear();
      refreshKodCheckboxes(false);
    });

    $('#kodForm').addEventListener('submit', kaydetKod);
    $('#btnKodIptal').addEventListener('click', resetKodForm);
    $('#kodListeSeriFilter').addEventListener('input', renderKodTable);
    $('#kodListeAciklamaFilter').addEventListener('input', renderKodTable);
    $('#btnListeFiltreTemizle').addEventListener('click', function () {
      $('#kodListeSeriFilter').value = '';
      $('#kodListeAciklamaFilter').value = '';
      renderKodTable();
    });

    $('#btnCsvImport').addEventListener('click', pickCsv);
    bindCsvInput('#csvInput');
    bindCsvInput('#csvHeaderInput');
    $('#btnCsvHeader').addEventListener('click', pickCsv);
    $('#btnCsvBanner').addEventListener('click', pickCsv);
    $('#btnCsvExport').addEventListener('click', exportCsv);

    $('#btnKlasorYukle').addEventListener('click', function () { $('#folderInput').click(); });
    $('#btnKlasorBagla').addEventListener('click', baglaKayitlarKlasoru);
    $('#folderInput').addEventListener('change', function (e) {
      if (e.target.files.length) loadFromFolder(e.target.files);
      e.target.value = '';
    });
  }

  function init() {
    loadStorage();
    bindEvents();
    renderMakineListesi();
    renderKodTable();
    updateCsvBanner();
    initKayitlarKlasoru();
  }

  init();
})();
