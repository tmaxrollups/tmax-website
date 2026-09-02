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
  let current = 0;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };
  prev?.addEventListener('click', () => { show(current - 1); });
  next?.addEventListener('click', () => { show(current + 1); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); }));
  show(0);
})();
