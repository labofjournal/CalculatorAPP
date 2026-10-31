const STORAGE_KEY = 'calculatorapp.guest-history.v1';
let activeUser = null;
let cloud = null;
let localItems = readLocal();

function readLocal() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value.slice(0, 50) : []; }
  catch { return []; }
}
function writeLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(localItems.slice(0, 50))); } catch (error) { console.warn('Riwayat lokal tidak dapat disimpan:', error); } }
function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function render(items) {
  const list = document.getElementById('history-list');
  const subtitle = document.getElementById('history-subtitle');
  if (!list) return;
  if (subtitle) subtitle.textContent = activeUser ? 'Riwayat akun ini tersinkronisasi melalui Firebase.' : 'Riwayat lokal tersimpan di browser ini.';
  if (!items.length) {
    list.innerHTML = '<li class="history-empty">Belum ada perhitungan. Hasil Anda akan muncul di sini.</li>';
    return;
  }
  list.innerHTML = items.slice(0, 50).map((item, index) => `
    <li class="history-item">
      <div class="history-main"><div class="history-expression">${escapeHTML(item.expression || '')}</div><div class="history-result">= ${escapeHTML(item.result || '')}</div><div class="history-time">${escapeHTML(formatTime(item.timestamp || item.createdAtMs))}</div></div>
      <button class="history-recall" type="button" data-recall="${index}" aria-label="Gunakan kembali perhitungan">Gunakan ↗</button>
    </li>`).join('');
  list.querySelectorAll('[data-recall]').forEach((button) => button.addEventListener('click', () => {
    const item = items[Number(button.dataset.recall)];
    if (item) document.dispatchEvent(new CustomEvent('history:recall', { detail: { expression: item.expression } }));
  }));
}

export async function setHistoryUser(user, cloudAdapter, notify) {
  activeUser = user || null;
  cloud = cloudAdapter || null;
  if (activeUser && cloud?.load) {
    try { const items = await cloud.load(); render(items || []); }
    catch (error) { console.error(error); render([]); notify?.('Riwayat cloud tidak dapat dimuat. Periksa Firestore Rules dan koneksi.', 'error'); }
  } else render(localItems);
}

export async function addHistory(expression, result, notify) {
  const entry = { expression, result, timestamp: Date.now() };
  if (activeUser && cloud?.add) {
    try { await cloud.add(entry); const items = await cloud.load(); render(items || []); }
    catch (error) { console.error('Gagal menyimpan riwayat ke Firestore:', error); notify?.('Hasil terhitung, tetapi riwayat cloud gagal disimpan.', 'error'); }
  } else {
    localItems = [entry, ...localItems].slice(0, 50);
    writeLocal();
    render(localItems);
  }
}

export async function clearHistory(notify) {
  if (activeUser && cloud?.clear) {
    try { await cloud.clear(); render([]); notify?.('Riwayat akun berhasil dihapus.'); }
    catch (error) { console.error(error); notify?.('Riwayat cloud gagal dihapus.', 'error'); }
  } else {
    localItems = []; writeLocal(); render(localItems); notify?.('Riwayat lokal berhasil dihapus.');
  }
}

export function setupHistoryControls(notify) {
  document.getElementById('history-clear')?.addEventListener('click', () => clearHistory(notify));
  document.addEventListener('history:recall', (event) => {
    document.dispatchEvent(new CustomEvent('calculator:insert-expression', { detail: event.detail }));
    document.querySelector('[data-tab="basic"]')?.click();
  });
  render(localItems);
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
