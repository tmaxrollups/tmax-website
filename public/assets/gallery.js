(() => {
  'use strict';
  document.querySelectorAll('.gallery').forEach((gallery) => {
    const slides = gallery.querySelectorAll('.gal-cell');
    if (slides.length < 2) {
      if (slides.length) slides[0].classList.add('active');
      return;
    }
    gallery.removeAttribute('style');
    gallery.setAttribute('aria-roledescription', 'carousel');
    gallery.setAttribute('aria-label', 'Recent installations');
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-btn carousel-prev';
    prev.setAttribute('aria-label', 'Previous image');
    prev.textContent = '\u2039';
    gallery.appendChild(prev);
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-btn carousel-next';
    next.setAttribute('aria-label', 'Next image');
    next.textContent = '\u203A';
    gallery.appendChild(next);
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'carousel-dots';
    let current = 0;
    let timer = null;
    function update() {
      slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
      dotsWrap.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
        dot.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { timer = setInterval(() => goTo(current + 1), 6000); }
    function restart() { stop(); start(); }
    function goTo(i) { current = ((i % slides.length) + slides.length) % slides.length; update(); restart(); }
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    gallery.appendChild(dotsWrap);
    prev.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));
    gallery.addEventListener('mouseenter', stop);
    gallery.addEventListener('mouseleave', start);
    gallery.addEventListener('focusin', stop);
    gallery.addEventListener('focusout', start);
    update(); start();
  });
})();
