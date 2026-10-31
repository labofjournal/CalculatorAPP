const FUNCTIONS = {
  sin: (x, mode) => Math.sin(toRadians(x, mode)),
  cos: (x, mode) => Math.cos(toRadians(x, mode)),
  tan: (x, mode) => {
    const radians = toRadians(x, mode);
    if (Math.abs(Math.cos(radians)) < 1e-12) throw new Error('Nilai tan tidak terdefinisi pada sudut ini.');
    return Math.tan(radians);
  },
  asin: (x, mode) => fromRadians(Math.asin(x), mode),
  acos: (x, mode) => fromRadians(Math.acos(x), mode),
  atan: (x, mode) => fromRadians(Math.atan(x), mode),
  sqrt: (x) => {
    if (x < 0) throw new Error('Akar kuadrat bilangan negatif tidak tersedia pada mode real.');
    return Math.sqrt(x);
  },
  cbrt: (x) => Math.cbrt(x),
  log: (x) => {
    if (x <= 0) throw new Error('Logaritma hanya menerima bilangan positif.');
    return Math.log10(x);
  },
  ln: (x) => {
    if (x <= 0) throw new Error('Logaritma hanya menerima bilangan positif.');
    return Math.log(x);
  },
  abs: (x) => Math.abs(x),
  exp: (x) => Math.exp(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x)
};

function toRadians(value, mode) { return mode === 'DEG' ? value * Math.PI / 180 : value; }
function fromRadians(value, mode) { return mode === 'DEG' ? value * 180 / Math.PI : value; }

function tokenize(source) {
  const input = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    const rest = input.slice(i);
    const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) throw new Error('Angka tidak valid.');
      tokens.push({ type: 'number', value }); i += number[0].length; continue;
    }
    const identifier = rest.match(/^[a-zA-Z]+/);
    if (identifier) { tokens.push({ type: 'identifier', value: identifier[0].toLowerCase() }); i += identifier[0].length; continue; }
    if ('+-*/^()%!'.includes(input[i])) { tokens.push({ type: 'symbol', value: input[i] }); i++; continue; }
    throw new Error(`Karakter tidak dikenal: ${input[i]}`);
  }
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

export function evaluateExpression(expression, angleMode = 'DEG') {
  const tokens = tokenize(String(expression));
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const expect = (symbol) => {
    if (peek().value !== symbol) throw new Error(`Diharapkan tanda "${symbol}".`);
    take();
  };
  const startsValue = (token) => token.type === 'number' || token.type === 'identifier' || token.value === '(';

  function parsePrimary() {
    const token = take();
    if (token.type === 'number') return token.value;
    if (token.value === '+' || token.value === '-') {
      const value = parseExpression(25);
      return token.value === '-' ? -value : value;
    }
    if (token.value === '(') {
      const value = parseExpression(0);
      expect(')');
      return value;
    }
    if (token.type === 'identifier') {
      if (token.value === 'pi') return Math.PI;
      if (token.value === 'e') return Math.E;
      if (!(token.value in FUNCTIONS)) throw new Error(`Fungsi "${token.value}" tidak dikenali.`);
      expect('(');
      const argument = parseExpression(0);
      expect(')');
      return FUNCTIONS[token.value](argument, angleMode);
    }
    throw new Error('Ekspresi belum lengkap.');
  }

  function parseExpression(minPrecedence) {
    let left = parsePrimary();
    while (true) {
      const token = peek();
      if (token.value === '!' || token.value === '%') {
        if (30 < minPrecedence) break;
        take();
        if (token.value === '!') left = factorial(left);
        else left = left / 100;
        continue;
      }
      let operator = token.value;
      let precedence = ({ '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 })[operator];
      let implicit = false;
      if (precedence === undefined && startsValue(token)) { operator = '*'; precedence = 20; implicit = true; }
      if (precedence === undefined || precedence < minPrecedence) break;
      if (!implicit) take();
      if (operator === '/' && peek().type === 'eof') throw new Error('Pembagi belum diisi.');
      const right = parseExpression(precedence + (operator === '^' ? 0 : 1));
      if (operator === '+') left += right;
      else if (operator === '-') left -= right;
      else if (operator === '*') left *= right;
      else if (operator === '/') {
        if (right === 0) throw new Error('Tidak dapat membagi dengan nol.');
        left /= right;
      } else if (operator === '^') left **= right;
    }
    return left;
  }

  if (peek().type === 'eof') throw new Error('Masukkan perhitungan terlebih dahulu.');
  const result = parseExpression(0);
  if (peek().type !== 'eof') throw new Error(`Ekspresi tidak valid di dekat "${peek().value}".`);
  if (!Number.isFinite(result)) throw new Error('Hasil berada di luar rentang angka yang didukung.');
  return Object.is(result, -0) ? 0 : result;
}

export function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Faktorial hanya mendukung bilangan bulat 0–170.');
  let result = 1;
  for (let i = 2; i <= value; i++) result *= i;
  return result;
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) return value.toExponential(8).replace(/\.?0+e/, 'e');
  return Number(value.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 10, useGrouping: false });
}
