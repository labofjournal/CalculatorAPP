import { loadPartials } from './include.js';
import { setupCalculator } from './calculator.js';
import { setupUnits } from './units.js';
import { addHistory, setHistoryUser, setupHistoryControls } from './history.js';

const FIREBASE_SDK_VERSION = '13.1.0';
let notify;
let firebaseContext = null;
let authMode = 'signin';

function showToast(message, type = 'success') {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4300);
}
notify = showToast;

await loadPartials();
const year = document.getElementById('current-year');
if (year) year.textContent = String(new Date().getFullYear());

function setupTabs() {
  const buttons = [...document.querySelectorAll('[data-tab]')];
  buttons.forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.tab;
    buttons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }));
}
setupTabs();

const calculator = setupCalculator({
  onHistory: (expression, result) => addHistory(expression, result, notify),
  notify
});
document.addEventListener('calculator:insert-expression', (event) => {
  // Restore a history expression through the same visible input flow.
  calculator.clear();
  const expression = String(event.detail?.expression || '');
  const target = document.querySelector('[data-tab="basic"]');
  target?.click();
  document.querySelectorAll('[data-expression]').forEach((node) => { node.textContent = expression || '0'; });
  // The calculator module owns its expression state; replay characters via a lightweight public event.
  document.dispatchEvent(new CustomEvent('calculator:restore', { detail: { expression } }));
});
setupHistoryControls(notify);

let appConfig = {};
try {
  const response = await fetch('data/config.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  appConfig = await response.json();
} catch (error) {
  console.error('Konfigurasi aplikasi gagal dimuat:', error);
  notify('Konfigurasi tidak dapat dimuat. Kalkulator tetap dapat digunakan.', 'error');
}
setupUnits(appConfig.units, notify);

const authDialog = document.getElementById('auth-dialog');
const authForm = document.getElementById('auth-form');
const authOpen = document.getElementById('auth-open');
const authClose = document.getElementById('auth-close');
const authSwitch = document.getElementById('auth-switch');
const authReset = document.getElementById('auth-reset');
const authError = document.getElementById('auth-error');
const authName = document.getElementById('auth-name');
const authNameLabel = document.getElementById('name-field-label');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-title').textContent = isSignup ? 'Buat akun baru' : 'Selamat datang kembali';
  document.getElementById('auth-subtitle').textContent = isSignup ? 'Daftar untuk menyimpan profil dan menyinkronkan riwayat Anda.' : 'Masuk untuk menyinkronkan profil dan riwayat kalkulasi Anda.';
  authName.classList.toggle('hidden', !isSignup);
  authNameLabel.classList.toggle('hidden', !isSignup);
  authName.required = isSignup;
  authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
  authSubmit.textContent = isSignup ? 'Buat akun' : 'Masuk ke akun';
  document.getElementById('auth-switch-text').textContent = isSignup ? 'Sudah punya akun?' : 'Belum punya akun?';
  authSwitch.textContent = isSignup ? 'Masuk' : 'Buat akun';
  authReset.classList.toggle('hidden', isSignup);
  authError.classList.add('hidden');
}
setAuthMode('signin');
authOpen?.addEventListener('click', () => { setAuthMode('signin'); authDialog?.showModal(); });
authClose?.addEventListener('click', () => authDialog?.close());
authDialog?.addEventListener('click', (event) => { if (event.target === authDialog) authDialog.close(); });
authSwitch?.addEventListener('click', () => setAuthMode(authMode === 'signin' ? 'signup' : 'signin'));

function firebaseConfigIsReady(config) {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  return !!config && required.every((key) => typeof config[key] === 'string' && config[key].trim() && !config[key].startsWith('YOUR_'));
}
function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}
function friendlyAuthError(code) {
  const messages = {
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
    'auth/user-not-found': 'Email atau kata sandi tidak sesuai.',
    'auth/wrong-password': 'Email atau kata sandi tidak sesuai.',
    'auth/invalid-credential': 'Email atau kata sandi tidak sesuai.',
    'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
    'auth/weak-password': 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba kembali nanti.',
    'auth/network-request-failed': 'Koneksi internet bermasalah.',
    'auth/operation-not-allowed': 'Aktifkan metode Email/Password di Firebase Console.'
  };
  return messages[code] || `Proses akun gagal (${code || 'unknown'}). Periksa konfigurasi Firebase.`;
}

async function startFirebase(config) {
  if (!firebaseConfigIsReady(config)) {
    document.getElementById('connection-indicator')?.classList.remove('connected');
    document.querySelector('#connection-indicator span').textContent = 'Firebase belum dikonfigurasi';
    authOpen.disabled = false;
    authOpen.title = 'Isi data Firebase pada data/config.json terlebih dahulu';
    return;
  }
  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);
    const firebaseApp = appModule.initializeApp(config);
    const auth = authModule.getAuth(firebaseApp);
    const db = firestoreModule.getFirestore(firebaseApp);
    firebaseContext = { auth, db, authModule, firestoreModule };
    document.getElementById('connection-indicator')?.classList.add('connected');
    document.querySelector('#connection-indicator span').textContent = 'Firebase aktif';
    authOpen.disabled = false;
    authModule.onAuthStateChanged(auth, async (user) => {
      updateAccountUI(user);
      if (user) {
        try {
          await firestoreModule.setDoc(firestoreModule.doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            lastLoginAt: firestoreModule.serverTimestamp(),
            updatedAt: firestoreModule.serverTimestamp()
          }, { merge: true });
          notify('Akun terhubung. Profil dan riwayat siap disinkronkan.');
        } catch (error) {
          console.error('Gagal memperbarui profil Firestore:', error);
          notify('Login berhasil, tetapi profil Firestore belum tersimpan. Periksa Firestore Rules.', 'error');
        }
      }
      const adapter = user ? createHistoryAdapter(user.uid) : null;
      await setHistoryUser(user, adapter, notify);
    });
  } catch (error) {
    console.error('Firebase gagal diinisialisasi:', error);
    document.querySelector('#connection-indicator span').textContent = 'Firebase tidak terhubung';
    notify('Firebase tidak dapat dihubungkan. Periksa internet dan konfigurasi SDK.', 'error');
  }
}

function createHistoryAdapter(uid) {
  const { db, firestoreModule: fs } = firebaseContext;
  const historyRef = fs.collection(db, 'users', uid, 'history');
  return {
    async add(entry) {
      await fs.addDoc(historyRef, { expression: entry.expression, result: entry.result, createdAt: fs.serverTimestamp(), createdAtMs: entry.timestamp });
    },
    async load() {
      const q = fs.query(historyRef, fs.orderBy('createdAt', 'desc'), fs.limit(50));
      const snapshot = await fs.getDocs(q);
      return snapshot.docs.map((item) => {
        const data = item.data();
        return { id: item.id, expression: data.expression, result: data.result, timestamp: data.createdAt?.toDate?.() || new Date(data.createdAtMs || Date.now()) };
      });
    },
    async clear() {
      const snapshot = await fs.getDocs(historyRef);
      const batch = fs.writeBatch(db);
      snapshot.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
  };
}

function updateAccountUI(user) {
  const label = document.getElementById('account-label');
  const signout = document.getElementById('auth-signout');
  if (user) {
    label.textContent = user.displayName || user.email || 'Pengguna';
    label.title = user.email || '';
    authOpen.classList.add('hidden');
    signout.classList.remove('hidden');
  } else {
    label.textContent = 'Belum masuk';
    authOpen.classList.remove('hidden');
    signout.classList.add('hidden');
  }
}

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  authError.classList.add('hidden');
  if (!firebaseContext) { showAuthError('Firebase belum siap. Isi data proyek Anda di data/config.json dan muat ulang aplikasi.'); return; }
  const email = document.getElementById('auth-email').value.trim();
  const password = authPassword.value;
  authSubmit.disabled = true;
  authSubmit.textContent = 'Memproses…';
  try {
    const { auth, db, authModule, firestoreModule: fs } = firebaseContext;
    if (authMode === 'signup') {
      const name = authName.value.trim();
      if (!name) throw new Error('Nama lengkap wajib diisi.');
      const credential = await authModule.createUserWithEmailAndPassword(auth, email, password);
      await authModule.updateProfile(credential.user, { displayName: name });
      await fs.setDoc(fs.doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email,
        displayName: name,
        createdAt: fs.serverTimestamp(),
        lastLoginAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp()
      }, { merge: true });
      try { await authModule.sendEmailVerification(credential.user); } catch (verificationError) { console.warn('Email verifikasi belum terkirim:', verificationError); }
      authDialog.close();
      authForm.reset();
      notify('Akun berhasil dibuat dan disimpan di Firebase. Periksa email untuk verifikasi.');
    } else {
      await authModule.signInWithEmailAndPassword(auth, email, password);
      authDialog.close();
      authForm.reset();
      notify('Berhasil masuk ke CalculatorAPP.');
    }
  } catch (error) {
    console.error(error);
    showAuthError(error.message && !error.code ? error.message : friendlyAuthError(error.code));
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = authMode === 'signup' ? 'Buat akun' : 'Masuk ke akun';
  }
});

authReset?.addEventListener('click', async () => {
  if (!firebaseContext) { showAuthError('Firebase belum dikonfigurasi.'); return; }
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthError('Masukkan email terlebih dahulu untuk menerima tautan reset.'); return; }
  try {
    await firebaseContext.authModule.sendPasswordResetEmail(firebaseContext.auth, email);
    showAuthError('Tautan reset kata sandi telah dikirim. Periksa kotak masuk email Anda.');
    authError.classList.remove('hidden');
    authError.style.color = '#8fe4c8';
  } catch (error) { showAuthError(friendlyAuthError(error.code)); }
});

document.getElementById('auth-signout')?.addEventListener('click', async () => {
  if (!firebaseContext) return;
  try { await firebaseContext.authModule.signOut(firebaseContext.auth); notify('Anda telah keluar dari akun.'); }
  catch (error) { console.error(error); notify('Tidak dapat keluar dari akun.', 'error'); }
});

await startFirebase(appConfig.firebase || {});
