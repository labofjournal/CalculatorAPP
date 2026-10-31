const FALLBACK_UNITS = {
  length: { label: 'Panjang', units: [{value:'m',label:'Meter',factor:1},{value:'km',label:'Kilometer',factor:1000},{value:'cm',label:'Sentimeter',factor:.01},{value:'mm',label:'Milimeter',factor:.001},{value:'mi',label:'Mil',factor:1609.344},{value:'yd',label:'Yard',factor:.9144},{value:'ft',label:'Kaki',factor:.3048},{value:'in',label:'Inci',factor:.0254}] },
  mass: { label: 'Massa / Berat', units: [{value:'kg',label:'Kilogram',factor:1},{value:'g',label:'Gram',factor:.001},{value:'mg',label:'Miligram',factor:.000001},{value:'lb',label:'Pound',factor:.45359237},{value:'oz',label:'Ounce',factor:.028349523125}] },
  temperature: { label: 'Suhu', units: [{value:'c',label:'Celsius'},{value:'f',label:'Fahrenheit'},{value:'k',label:'Kelvin'}] },
  volume: { label: 'Volume', units: [{value:'l',label:'Liter',factor:1},{value:'ml',label:'Mililiter',factor:.001},{value:'m3',label:'Meter kubik',factor:1000},{value:'gal',label:'US gallon',factor:3.785411784},{value:'cup',label:'US cup',factor:.2365882365}] },
  speed: { label: 'Kecepatan', units: [{value:'ms',label:'Meter/detik',factor:1},{value:'kmh',label:'Kilometer/jam',factor:1/3.6},{value:'mph',label:'Mil/jam',factor:.44704}] },
  time: { label: 'Waktu', units: [{value:'s',label:'Detik',factor:1},{value:'min',label:'Menit',factor:60},{value:'h',label:'Jam',factor:3600},{value:'day',label:'Hari',factor:86400}] }
};

const toCelsius = (value, unit) => unit === 'f' ? (value - 32) * 5 / 9 : unit === 'k' ? value - 273.15 : value;
const fromCelsius = (value, unit) => unit === 'f' ? value * 9 / 5 + 32 : unit === 'k' ? value + 273.15 : value;

export function setupUnits(configUnits, notify) {
  const category = document.getElementById('unit-category');
  const amount = document.getElementById('unit-amount');
  const from = document.getElementById('unit-from');
  const to = document.getElementById('unit-to');
  const result = document.getElementById('unit-result');
  const resultUnit = document.getElementById('unit-result-unit');
  const note = document.getElementById('unit-note');
  const swap = document.getElementById('unit-swap');
  if (!category || !amount || !from || !to) return;
  const groups = configUnits && Object.keys(configUnits).length ? configUnits : FALLBACK_UNITS;
  const groupEntries = Object.entries(groups);
  category.innerHTML = groupEntries.map(([key, group]) => `<option value="${key}">${escapeHTML(group.label)}</option>`).join('');

  function fillUnits() {
    const group = groups[category.value];
    const options = group.units.map((unit) => `<option value="${unit.value}">${escapeHTML(unit.label)}</option>`).join('');
    from.innerHTML = options;
    to.innerHTML = options;
    if (to.options.length > 1) to.selectedIndex = 1;
    convert();
  }
  function convert() {
    const value = Number(amount.value);
    const group = groups[category.value];
    const source = group.units.find((unit) => unit.value === from.value);
    const target = group.units.find((unit) => unit.value === to.value);
    if (!Number.isFinite(value) || !source || !target) { result.textContent = '—'; return; }
    let converted;
    if (category.value === 'temperature') converted = fromCelsius(toCelsius(value, source.value), target.value);
    else converted = value * source.factor / target.factor;
    if (category.value === 'temperature' && target.value === 'k' && converted < 0) {
      result.textContent = 'Tidak valid'; note.textContent = 'Suhu Kelvin tidak dapat bernilai di bawah nol mutlak.'; return;
    }
    result.textContent = new Intl.NumberFormat('id-ID', { maximumSignificantDigits: 12 }).format(converted);
    resultUnit.textContent = target.label;
    note.textContent = `${new Intl.NumberFormat('id-ID', { maximumSignificantDigits: 12 }).format(value)} ${source.label} = ${new Intl.NumberFormat('id-ID', { maximumSignificantDigits: 12 }).format(converted)} ${target.label}`;
  }
  category.addEventListener('change', fillUnits);
  [amount, from, to].forEach((element) => element.addEventListener('input', convert));
  swap?.addEventListener('click', () => { const oldFrom = from.value; from.value = to.value; to.value = oldFrom; convert(); });
  fillUnits();
  return { convert };
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
