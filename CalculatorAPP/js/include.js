export async function loadPartials() {
  const targets = [...document.querySelectorAll('[data-include]')];
  const results = await Promise.all(targets.map(async (target) => {
    const path = target.dataset.include;
    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      target.innerHTML = await response.text();
      target.removeAttribute('data-include');
      return { path, ok: true };
    } catch (error) {
      target.innerHTML = `<div class="include-error">Komponen ${path} tidak dapat dimuat.</div>`;
      console.error(`Gagal memuat ${path}:`, error);
      return { path, ok: false };
    }
  }));
  const failed = results.filter((item) => !item.ok);
  if (failed.length) console.warn('Partial tidak termuat:', failed.map((item) => item.path));
  document.dispatchEvent(new CustomEvent('partials:loaded', { detail: results }));
  return results;
}
