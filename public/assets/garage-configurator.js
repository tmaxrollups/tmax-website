(() => {
  'use strict';
  // Display-only pricing. The Netlify function independently validates the
  // selections and recalculates every submitted estimate from the approved table.
  const prices = {
    '6': {'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530},
    '7': {'3':2400,'4':2530,'5':2665,'6':2800,'7':2935,'8':2935,'9':3065,'10':3330,'11':3865,'12':3865,'13':4265,'14':4265,'15':4265,'16':4265,'17':4395,'18.5':4530},
    '8': {'3':2600,'4':2735,'5':2870,'6':3000,'7':3130,'8':3130,'9':3265,'10':3531,'11':4065,'12':4065,'13':4465,'14':4465,'15':4465,'16':4465,'17':4595,'18.5':4730},
    '9': {'3':3730,'4':3865,'5':3995,'6':4135,'7':4265,'8':4265,'9':4395,'10':4660,'11':5195,'12':5195,'13':5595,'14':5595,'15':5595,'16':5595,'17':5730,'18.5':5860}
  };
  const quoteOnlyHeights = ['10','11','12'];
  const swatches = document.querySelectorAll('.tmax-swatch');
  const widthSel = document.getElementById('cfg-width');
  const heightSel = document.getElementById('cfg-height');
  const railSel = document.getElementById('cfg-rail-color');
  const summaryEl = document.getElementById('cfg-summary');
  const priceEl = document.getElementById('cfg-price');
  const hColor = document.getElementById('hidden-color');
  const hRail = document.getElementById('hidden-rail-color');
  const hWidth = document.getElementById('hidden-width');
  const hHeight = document.getElementById('hidden-height');
  if (!widthSel || !heightSel || !railSel || !summaryEl || !priceEl || !hColor || !hRail || !hWidth || !hHeight) return;

  let selectedColor = '';
  const syncSwatchState = (selectedButton) => {
    swatches.forEach((s) => {
      const selected = s === selectedButton;
      s.classList.toggle('selected', selected);
      s.setAttribute('aria-checked', String(selected));
      s.setAttribute('tabindex', selected ? '0' : '-1');
    });
  };
  const fmt = (n) => '$' + n.toLocaleString('en-US');

  function update() {
    const w = widthSel.value;
    const h = heightSel.value;
    const rail = railSel.value;
    hWidth.value = w;
    hHeight.value = h;
    hRail.value = rail;

    const parts = [];
    if (selectedColor) parts.push(`${selectedColor} door`);
    if (rail) parts.push(`${rail} rails/housing`);
    if (w && h) parts.push(`${w} ft × ${h} ft`);
    summaryEl.textContent = parts.length ? parts.join(' · ') : 'Select door color, rail/housing color and size to see pricing';

    // Reset visual flags
    priceEl.classList.remove('custom','pop');

    if (!selectedColor || !rail || !w || !h) {
      priceEl.textContent = '—';
      return;
    }
    if (quoteOnlyHeights.includes(h)) {
      priceEl.classList.add('custom');
      priceEl.textContent = 'Request quote';
      return;
    }
    const price = prices[h] && prices[h][w];
    if (!price) {
      priceEl.classList.add('custom');
      priceEl.textContent = 'Request quote';
      return;
    }
    const newText = fmt(price);
    // Only animate when price changes to a concrete value
    if (priceEl.textContent !== newText) {
      priceEl.textContent = newText;
      priceEl.classList.add('pop');
      try {
        priceEl.animate([
          { transform: 'scale(1)', offset: 0 },
          { transform: 'scale(1.06)', offset: 0.5 },
          { transform: 'scale(1)', offset: 1 }
        ], { duration: 300, easing: 'ease-out' });
      } catch (e) { /* animate may not be available */ }
      // ensure the price is visible in viewport without jarring on small screens
      const rect = priceEl.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
        priceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => priceEl.classList.remove('pop'), 1200);
    } else {
      priceEl.textContent = newText;
    }
  }

  const selectSwatch = (sw) => {
    selectedColor = sw.dataset.color || '';
    hColor.value = selectedColor;
    syncSwatchState(sw);
    update();
  };

  swatches.forEach((sw, index) => {
    sw.setAttribute('tabindex', index === 0 ? '0' : '-1');
    sw.addEventListener('click', () => selectSwatch(sw));
    sw.addEventListener('keydown', (event) => {
      const currentIndex = swatches.indexOf(sw);
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        selectSwatch(sw);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = swatches[(currentIndex + 1) % swatches.length];
        next.focus();
        selectSwatch(next);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = swatches[(currentIndex - 1 + swatches.length) % swatches.length];
        prev.focus();
        selectSwatch(prev);
      }
    });
  });

  syncSwatchState(swatches[0]);

  widthSel.addEventListener('change', update);
  heightSel.addEventListener('change', update);
  railSel.addEventListener('change', update);
})();
