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

    // Timeline horizontal: los hitos entran en cascada al aparecer
    var tlCards = document.querySelectorAll('.tl-card');
    if (tlCards.length) {
      gsap.set(tlCards, { opacity: 0, y: 24 });
      window.ScrollTrigger.batch(tlCards, {
        start: 'top 90%',
        onEnter: function (els) {
          gsap.to(els, { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: 'power2.out', overwrite: true });
        }
      });
      // Red de seguridad: si algo falla, mostrarlos igual
      setTimeout(function () { gsap.set(tlCards, { opacity: 1, y: 0 }); }, 3500);
    }

    // Parallax sutil en las manchas del hero
    gsap.to('.blob-y', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.blob-v', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
})();
