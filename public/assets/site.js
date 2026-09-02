(() => {
  'use strict';
  const mainTarget = 'main-content';
  if (!document.getElementById(mainTarget)) {
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        left: 12px;
        top: -48px;
        z-index: 1000;
        padding: 12px 16px;
        background: #fff;
        color: #000;
        border: 2px solid #000;
        border-radius: 4px;
        font-family: 'Raleway', sans-serif;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        transition: top 0.15s ease;
      }
      .skip-link:focus {
        top: 12px;
      }
    `;
    document.head.appendChild(style);

    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = `#${mainTarget}`;
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);

    const header = document.querySelector('.site-header');
    const firstContent = header ? header.nextElementSibling : document.body.firstElementChild;
    if (firstContent) {
      firstContent.id = mainTarget;
      if (!firstContent.hasAttribute('tabindex')) firstContent.setAttribute('tabindex', '-1');
    }
  }

  document.querySelectorAll('.menu-toggle').forEach((button) => {
    button.removeAttribute('onclick');
    button.addEventListener('click', () => {
      const navId = button.getAttribute('aria-controls');
      const nav = navId ? document.getElementById(navId) : null;
      if (!nav) return;
      const isOpen = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });
})();

(() => {
  'use strict';
  const slider = document.querySelector('[data-hero-slider]');
  if (!slider) return;
  const slides = Array.from(slider.querySelectorAll('[data-hero-slide]'));
  const dots = Array.from(slider.querySelectorAll('[data-hero-dot]'));
  const prev = slider.querySelector('.hero-prev');
  const next = slider.querySelector('.hero-next');
  if (slides.length < 2) return;
  let current = 0;
  let timer;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = undefined; };
  const start = () => { if (!reduced) { stop(); timer = window.setInterval(() => show(current + 1), 9000); } };
  prev?.addEventListener('click', () => { show(current - 1); start(); });
  next?.addEventListener('click', () => { show(current + 1); start(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); start(); }));
  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('focusin', stop);
  slider.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  show(0);
  start();
})();

(function() {
  'use strict';
  function initCaptchaGuard() {
  const forms = Array.from(document.querySelectorAll('form[data-netlify-recaptcha="true"]'));
  forms.forEach(form => {
    const submitButtons = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'));
    if (!submitButtons.length) return;
    // start disabled until captcha proves completion
    submitButtons.forEach(btn => btn.disabled = true);
    const check = () => {
      const textarea = form.querySelector('textarea[name="g-recaptcha-response"]');
      if (textarea && textarea.value && textarea.value.trim().length > 0) {
        submitButtons.forEach(b => b.disabled = false);
        return true;
      }
      return false;
    };
    if (check()) return;
    // Observe DOM changes and polling as fallbacks
    const observer = new MutationObserver(() => { if (check()) observer.disconnect(); });
    observer.observe(form, { childList: true, subtree: true, characterData: true, attributes: true });
    const interval = setInterval(() => { if (check()) clearInterval(interval); }, 500);
    // Re-disable on reset
    form.addEventListener('reset', () => submitButtons.forEach(btn => btn.disabled = true));
    // Prevent submit while disabled
    form.addEventListener('submit', (e) => { if (submitButtons.some(b => b.disabled)) { e.preventDefault(); } });
  });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCaptchaGuard);
  else initCaptchaGuard();
})();
