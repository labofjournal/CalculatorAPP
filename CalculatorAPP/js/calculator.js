import { evaluateExpression, formatNumber } from './scientific.js';

export function setupCalculator({ onHistory, notify }) {
  let expression = '';
  let resultText = '0';
  let justEvaluated = false;
  let angleMode = 'DEG';

  const expressionNodes = () => document.querySelectorAll('[data-expression]');
  const resultNodes = () => document.querySelectorAll('[data-result]');
  function render() {
    expressionNodes().forEach((node) => { node.textContent = expression || '0'; });
    resultNodes().forEach((node) => { node.textContent = resultText; });
  }
  function insert(value) {
    if (justEvaluated && /^[0-9.]$/.test(value)) expression = '';
    if (justEvaluated && /^(?:\+|−|×|÷|\^|%|!)/.test(value)) justEvaluated = false;
    if (value === '.') {
      const tail = expression.split(/[+−×÷^()%]/).pop();
      if (tail.includes('.')) return;
      if (!tail) value = '0.';
    }
    expression += value;
    resultText = '…';
    justEvaluated = false;
    render();
    try { resultText = formatNumber(evaluateExpression(expression, angleMode)); render(); } catch { /* Input may be incomplete while typing. */ }
  }
  function clear() { expression = ''; resultText = '0'; justEvaluated = false; render(); }
  function removeLast() {
    if (!expression) return;
    const functionName = expression.match(/(asin|acos|atan|sin|cos|tan|sqrt|log|ln)\($/);
    expression = functionName ? expression.slice(0, -functionName[0].length) : expression.slice(0, -1);
    resultText = '…'; justEvaluated = false; render();
    try { resultText = formatNumber(evaluateExpression(expression, angleMode)); render(); } catch { /* still editing */ }
  }
  function toggleSign() {
    if (!expression) { expression = '-'; render(); return; }
    try {
      const value = evaluateExpression(expression, angleMode);
      expression = String(-value);
      resultText = formatNumber(-value);
      justEvaluated = true;
      render();
    } catch { expression = `-(${expression})`; render(); }
  }
  function equals() {
    if (!expression.trim()) return;
    try {
      const numeric = evaluateExpression(expression, angleMode);
      resultText = formatNumber(numeric);
      render();
      onHistory?.(expression, resultText);
      expression = resultText;
      justEvaluated = true;
      render();
    } catch (error) {
      notify?.(error.message || 'Perhitungan tidak dapat diproses.', 'error');
    }
  }
  function setAngleMode(mode) {
    angleMode = mode === 'RAD' ? 'RAD' : 'DEG';
    if (expression) {
      try { resultText = formatNumber(evaluateExpression(expression, angleMode)); } catch { resultText = '…'; }
      render();
    }
  }

  document.addEventListener('click', (event) => {
    const key = event.target.closest('[data-key], [data-insert], [data-command]');
    if (!key) return;
    if (key.dataset.key !== undefined) insert(key.dataset.key);
    else if (key.dataset.insert !== undefined) insert(key.dataset.insert);
    else if (key.dataset.command === 'clear') clear();
    else if (key.dataset.command === 'delete') removeLast();
    else if (key.dataset.command === 'sign') toggleSign();
    else if (key.dataset.command === 'equals') equals();
  });
  document.addEventListener('calculator:restore', (event) => {
    expression = String(event.detail?.expression || '');
    justEvaluated = false;
    if (!expression) resultText = '0';
    else {
      try { resultText = formatNumber(evaluateExpression(expression, angleMode)); }
      catch { resultText = '…'; }
    }
    render();
  });

  document.addEventListener('click', (event) => {
    const angleButton = event.target.closest('[data-angle]');
    if (!angleButton) return;
    document.querySelectorAll('[data-angle]').forEach((button) => {
      const active = button === angleButton;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    setAngleMode(angleButton.dataset.angle);
  });
  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9.]$/.test(event.key)) { insert(event.key); event.preventDefault(); }
    else if (event.key === '+') { insert('+'); event.preventDefault(); }
    else if (event.key === '-') { insert('−'); event.preventDefault(); }
    else if (event.key === '*') { insert('×'); event.preventDefault(); }
    else if (event.key === '/') { insert('÷'); event.preventDefault(); }
    else if (event.key === '^' || event.key === '(' || event.key === ')' || event.key === '%') { insert(event.key); event.preventDefault(); }
    else if (event.key === 'Enter' || event.key === '=') { equals(); event.preventDefault(); }
    else if (event.key === 'Backspace') { removeLast(); event.preventDefault(); }
    else if (event.key === 'Escape') { clear(); event.preventDefault(); }
  });
  render();
  return { clear, getExpression: () => expression, setAngleMode };
}
