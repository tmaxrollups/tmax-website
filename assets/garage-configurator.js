(() => {
  'use strict';
  const prices = {
    '6': {'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530},
    '7': {'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530},
    '8': {'3':2600,'4':2735,'5':2870,'6':3000,'7':3130,'8':3130,'9':3265,'10':3531,'11':4065,'12':4065,'13':4465,'14':4465,'15':4465,'16':4465,'17':4595,'18.5':4730},
    '9': {'3':3730,'4':3865,'5':3995,'6':4135,'7':4265,'8':4265,'9':4395,'10':4660,'11':5195,'12':5195,'13':5595,'14':5595,'15':5595,'16':5595,'17':5730,'18.5':5860}
  };
  const customHeights = ['10','11','12'];
  const colorUpcharges = {'Wood Grain':120};
  const swatches = document.querySelectorAll('.tmax-swatch');
  const widthSel = document.getElementById('cfg-width');
  const heightSel = document.getElementById('cfg-height');
  const summaryEl = document.getElementById('cfg-summary');
  const priceEl = document.getElementById('cfg-price');
  const hColor = document.getElementById('hidden-color');
  const hWidth = document.getElementById('hidden-width');
  const hHeight = document.getElementById('hidden-height');
  const hPrice = document.getElementById('hidden-price');
  if (!widthSel || !heightSel || !summaryEl || !priceEl || !hColor || !hWidth || !hHeight || !hPrice) return;
  let selectedColor = '';
  const fmt = (n) => '$' + n.toLocaleString('en-US');
  function update() {
    const w = widthSel.value; const h = heightSel.value;
    hWidth.value = w; hHeight.value = h;
    const parts = [];
    if (selectedColor) parts.push(selectedColor);
    if (w && h) parts.push(`${w} ft × ${h} ft`);
    summaryEl.textContent = parts.length ? parts.join(' · ') : 'Select color and size to see pricing';
    priceEl.classList.remove('custom');
    if (!selectedColor || !w || !h) { priceEl.textContent = '—'; hPrice.value = ''; return; }
    if (customHeights.includes(h)) { priceEl.classList.add('custom'); priceEl.textContent = 'Custom quote'; hPrice.value = `Custom quote (height ${h} ft)`; return; }
    const p = prices[h] && prices[h][w];
    if (!p) { priceEl.classList.add('custom'); priceEl.textContent = 'Contact us'; hPrice.value = ''; return; }
    const upcharge = colorUpcharges[selectedColor] || 0;
    const total = p + upcharge;
    priceEl.textContent = fmt(total);
    hPrice.value = fmt(total) + (upcharge ? ` (base ${fmt(p)} + ${fmt(upcharge)} ${selectedColor})` : '');
  }
  swatches.forEach((sw) => sw.addEventListener('click', () => {
    swatches.forEach((s) => { s.classList.remove('selected'); s.setAttribute('aria-checked','false'); });
    sw.classList.add('selected'); sw.setAttribute('aria-checked','true'); selectedColor = sw.dataset.color || ''; hColor.value = selectedColor; update();
  }));
  widthSel.addEventListener('change', update); heightSel.addEventListener('change', update);
})();
