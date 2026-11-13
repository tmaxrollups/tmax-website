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
      if (!isOpen) nav.querySelectorAll('.nav-products[open]').forEach((menu) => menu.removeAttribute('open'));
    });
  });

  const productMenus = Array.from(document.querySelectorAll('.nav-products'));
  productMenus.forEach((menu) => {
    const currentLink = Array.from(menu.querySelectorAll('a')).find((link) => {
      const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, '');
      const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      return linkPath === currentPath;
    });
    if (currentLink) {
      currentLink.setAttribute('aria-current', 'page');
      menu.classList.add('is-active');
    }
  });

  document.addEventListener('click', (event) => {
    productMenus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      productMenus.forEach((menu) => {
        if (!menu.open) return;
        menu.removeAttribute('open');
        menu.querySelector('summary')?.focus();
      });
    }
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
  // Reserve the same content rows, including the first slide's seasonal label.
  // Measure natural text heights so wrapping and font changes cannot shift slides.
  const alignContent = () => {
    const outerHeight = (element) => {
      if (!element) return 0;
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    };
    slider.style.removeProperty('--hero-button-height');
    for (const [property, selector] of [
      ['--hero-primary-width', '.hero-btns .btn-primary'],
      ['--hero-secondary-width', '.hero-btns .btn-ghost-dark']
    ]) {
      slider.style.removeProperty(property);
      const width = Math.max(...slides.map((slide) => slide.querySelector(selector)?.getBoundingClientRect().width || 0));
      slider.style.setProperty(property, `${Math.ceil(width)}px`);
    }
    const buttonHeight = Math.max(...Array.from(slider.querySelectorAll('.hero-btns a'), outerHeight));
    slider.style.setProperty('--hero-button-height', `${buttonHeight}px`);
    for (const [property, selector] of [
      ['--hero-label-height', '.hero-seasonal-label'],
      ['--hero-title-height', '.hero-copy > h1, .hero-copy > h2'],
      ['--hero-description-height', '.hero-desc'],
      ['--hero-actions-height', '.hero-btns']
    ]) {
      const height = Math.max(...slides.map((slide) => outerHeight(slide.querySelector(selector))));
      slider.style.setProperty(property, `${height}px`);
    }
  };
  alignContent();
  document.fonts?.ready.then(alignContent);
  if ('ResizeObserver' in window) new ResizeObserver(alignContent).observe(slider);

  let current = 0;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', String(active));
    });
  };
  prev?.addEventListener('click', () => { show(current - 1); });
  next?.addEventListener('click', () => { show(current + 1); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); }));
  show(0);
})();

(() => {
  'use strict';
  if (window.__tmaxGoogleAnalyticsLoaded) return;
  window.__tmaxGoogleAnalyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-B1NX9HZ8S6');

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-B1NX9HZ8S6';
  document.head.appendChild(script);

  // Track form engagement without sending names, email addresses, phone numbers,
  // form contents, or other personally identifiable information to Google.
  const trackedForms = new WeakSet();
  document.querySelectorAll('form').forEach((form) => {
    // The hidden form name survives Netlify's deploy-time form processing.
    const formName = form.querySelector('input[name="form-name"]')?.value;
    if (!formName) return;
    form.addEventListener('focusin', () => {
      if (trackedForms.has(form)) return;
      trackedForms.add(form);
      gtag('event', 'form_start', { form_name: formName });
    }, { once: true });

    form.addEventListener('submit', () => {
      // Netlify's successful POST redirects to /thanks/. That page records the
      // completed lead, avoiding counting a failed submission as a conversion.
      try { window.sessionStorage.setItem('tmax_pending_lead', formName); } catch (_) {}
      gtag('event', 'form_submit', { form_name: formName });
    });
  });

  // Useful contact-intent events. Only the link type is sent, never its value.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!link) return;
    gtag('event', link.href.startsWith('tel:') ? 'phone_click' : 'email_click', {
      link_type: link.href.startsWith('tel:') ? 'telephone' : 'email'
    });
  });

  // A real form POST reaches this page only after Netlify accepts the submission.
  if (/\/thanks\/?$/.test(window.location.pathname)) {
    try {
      const formName = window.sessionStorage.getItem('tmax_pending_lead');
      if (formName) {
        gtag('event', 'generate_lead', { form_name: formName, method: 'netlify' });
        window.sessionStorage.removeItem('tmax_pending_lead');
      }
    } catch (_) {}
  }
})();
