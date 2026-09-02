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

      const ensureFallback = () => {
        let fallback = form.querySelector('[data-captcha-fallback]');
        if (fallback) return fallback;

        fallback = document.createElement('div');
        fallback.setAttribute('data-captcha-fallback', 'true');
        fallback.style.cssText = 'display:none;margin-top:16px;padding:14px 16px;border:1px solid #d4cfc0;border-radius:4px;background:#fff;';
        fallback.innerHTML = `
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.5;cursor:pointer;">
            <input type="checkbox" data-captcha-fallback-check style="margin-top:4px;width:18px;height:18px;min-height:18px;accent-color:#bf9749;">
            <span>
              I do not see the verification box. I understand this request may be reviewed manually before it is sent.
            </span>
          </label>
        `;
        form.appendChild(fallback);
        return fallback;
      };

      const getCaptchaReady = () => {
        const textarea = form.querySelector('textarea[name="g-recaptcha-response"]');
        return Boolean(textarea && textarea.value && textarea.value.trim().length > 0);
      };

      const setSubmitState = () => {
        const fallback = form.querySelector('[data-captcha-fallback]');
        const fallbackCheck = fallback ? fallback.querySelector('[data-captcha-fallback-check]') : null;
        const captchaReady = getCaptchaReady();
        const fallbackReady = Boolean(fallbackCheck && fallbackCheck.checked);
        const enabled = captchaReady || fallbackReady;
        submitButtons.forEach(btn => { btn.disabled = !enabled; });
        return enabled;
      };

      const hasCaptchaTextarea = Boolean(form.querySelector('textarea[name="g-recaptcha-response"]'));
      if (!hasCaptchaTextarea) {
        const fallback = ensureFallback();
        fallback.style.display = 'block';
        submitButtons.forEach(btn => { btn.disabled = true; });
        fallback.querySelector('[data-captcha-fallback-check]')?.addEventListener('change', setSubmitState);
        form.addEventListener('submit', (e) => {
          if (!setSubmitState()) e.preventDefault();
        });
        return;
      }

      const observer = new MutationObserver(() => {
        if (getCaptchaReady()) {
          submitButtons.forEach(btn => { btn.disabled = false; });
          observer.disconnect();
        }
      });
      observer.observe(form, { childList: true, subtree: true, characterData: true, attributes: true });

      const timeout = window.setTimeout(() => {
        if (getCaptchaReady()) return;
        const fallback = ensureFallback();
        fallback.style.display = 'block';
        submitButtons.forEach(btn => { btn.disabled = true; });
        const fallbackCheck = fallback.querySelector('[data-captcha-fallback-check]');
        fallbackCheck?.addEventListener('change', setSubmitState);
        setSubmitState();
      }, 5000);

      const interval = setInterval(() => {
        if (getCaptchaReady()) {
          clearInterval(interval);
          window.clearTimeout(timeout);
          submitButtons.forEach(btn => { btn.disabled = false; });
        }
      }, 500);

      form.addEventListener('submit', (e) => {
        if (!setSubmitState()) {
          e.preventDefault();
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCaptchaGuard);
  else initCaptchaGuard();
})();
