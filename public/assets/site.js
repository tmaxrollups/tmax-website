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

      const getCaptcha = () => form.querySelector('textarea[name="g-recaptcha-response"]');
      const setState = () => {
        const captcha = getCaptcha();
        const ready = Boolean(captcha && captcha.value && captcha.value.trim().length > 0);
        submitButtons.forEach(btn => { btn.disabled = !ready; });
        return ready;
      };

      submitButtons.forEach(btn => { btn.disabled = true; });

      const timeout = window.setTimeout(() => {
        if (setState()) return;
        const noticeId = `${form.id || form.name || 'form'}-captcha-notice`;
        if (!form.querySelector('#' + noticeId)) {
          const note = document.createElement('p');
          note.id = noticeId;
          note.setAttribute('role', 'alert');
          note.style.cssText = 'margin:12px 0 0;color:#8a1f11;font-size:14px;line-height:1.5;';
          note.textContent = 'Verification is not available right now. Please refresh the page before submitting.';
          const captchaWrap = form.querySelector('[data-netlify-recaptcha="true"]') || submitButtons[0];
          captchaWrap.parentNode.insertBefore(note, captchaWrap);
        }
      }, 5000);

      const observer = new MutationObserver(() => {
        if (setState()) {
          clearTimeout(timeout);
          observer.disconnect();
        }
      });
      observer.observe(form, { childList: true, subtree: true, characterData: true, attributes: true });

      const poll = window.setInterval(() => {
        if (setState()) {
          clearInterval(poll);
          clearTimeout(timeout);
        }
      }, 400);

      form.addEventListener('submit', (e) => {
        if (!setState()) e.preventDefault();
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCaptchaGuard);
  else initCaptchaGuard();
})();
