/* ==========================================================================
   Giro 360 — Mejoras progresivas con librerías (cargadas por CDN).
   Si alguna no cargó, se saltea sin romper nada.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- CountUp: números que suben al entrar en pantalla -------------- */
  var CountUp = window.countUp && window.countUp.CountUp;
  if (CountUp && 'IntersectionObserver' in window) {
    var nums = document.querySelectorAll('[data-count-to]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var end = parseFloat(el.getAttribute('data-count-to'));
        if (isNaN(end)) return;
        var dec = parseInt(el.getAttribute('data-count-dec') || '0', 10);
        var opts = {
          decimalPlaces: dec,
          decimal: ',',
          separator: '.',
          duration: 1.6,
          suffix: el.getAttribute('data-count-suffix') || '',
          prefix: el.getAttribute('data-count-prefix') || ''
        };
        if (reduceMotion) opts.duration = 0.01;
        var cu = new CountUp(el, end, opts);
        if (!cu.error) cu.start();
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(nums, function (n) { io.observe(n); });
  }

  /* --- GSAP + ScrollTrigger: línea de tiempo y reveals ------------- */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    // Timeline: la línea "se dibuja" y los hitos entran uno a uno
    var tl = document.querySelector('.timeline');
    if (tl) {
      var items = tl.querySelectorAll('.tl-item');
      gsap.set(items, { opacity: 0, x: -18 });
      window.ScrollTrigger.batch(items, {
        start: 'top 85%',
        onEnter: function (els) {
          gsap.to(els, { opacity: 1, x: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out', overwrite: true });
        }
      });
      // Red de seguridad: si algo falla, mostrarlos igual
      setTimeout(function () { gsap.set(items, { opacity: 1, x: 0 }); }, 3500);
      var fill = { v: 0 };
      gsap.to(fill, {
        v: 100, ease: 'none',
        scrollTrigger: { trigger: tl, start: 'top 78%', end: 'bottom 55%', scrub: true },
        onUpdate: function () { tl.style.setProperty('--tl-fill', fill.v + '%'); }
      });
    }

    // Parallax sutil en las manchas del hero
    gsap.to('.blob-y', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.blob-v', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
})();
