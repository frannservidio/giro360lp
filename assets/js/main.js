/* ==========================================================================
   Giro 360 — Portfolio
   Interacciones de la página (sin dependencias)
   ========================================================================== */
(function () {
  'use strict';

  /* Activa los efectos que dependen de JS (definidos bajo .js en el CSS) */
  document.documentElement.classList.add('js');

  var header = document.querySelector('header');
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.navlinks');
  var links = Array.prototype.slice.call(document.querySelectorAll('.navlinks a[href^="#"]'));

  /* --- Menú mobile ----------------------------------------------------- */
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Sombra del header al hacer scroll ------------------------------ */
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- Aparición de secciones al entrar en viewport ----------------- */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
    /* Red de seguridad: si algo no se observó a tiempo, mostralo igual */
    window.setTimeout(function () {
      revealables.forEach(function (el) { el.classList.add('is-visible'); });
    }, 2500);
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* --- Casos en video: fachada + clic para reproducir --------------- */
  Array.prototype.forEach.call(document.querySelectorAll('.videocard[data-url]'), function (card) {
    card.addEventListener('click', function () {
      var url = (card.getAttribute('data-url') || '').trim();
      if (!url || url.indexOf('REEMPLAZAR') !== -1) return;   // placeholder sin completar
      var src = url.replace(/\/+$/, '') + '/embed';

      var frame = document.createElement('iframe');
      frame.className = 'videocard-frame';
      frame.src = src;
      frame.loading = 'lazy';
      frame.title = card.getAttribute('aria-label') || 'Video de Instagram';
      frame.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('scrolling', 'no');

      var box = document.createElement('div');
      box.className = 'videocard is-playing';
      box.appendChild(frame);
      card.replaceWith(box);
    });
  });

  /* --- Equipo: mostrar la foto sólo si el archivo existe ----------- */
  Array.prototype.forEach.call(document.querySelectorAll('.member-photo'), function (img) {
    var show = function () {
      if (img.naturalWidth > 0) {
        var m = img.closest('.member');
        if (m) m.classList.add('has-photo');
      }
    };
    if (img.complete) show();
    img.addEventListener('load', show);
  });

  /* --- Marcas: mostrar el logo sólo si el archivo existe ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.brand-logo'), function (img) {
    var show = function () {
      if (img.naturalWidth > 0) {
        var t = img.closest('.brand-tile');
        if (t) t.classList.add('has-logo');
      }
    };
    if (img.complete) show();
    img.addEventListener('load', show);
  });

  /* --- Testimonios: carrusel (flechas + swipe + hover en los bordes) --- */
  Array.prototype.forEach.call(document.querySelectorAll('.qcarousel'), function (car) {
    var track = car.querySelector('.qc-track');
    var prev = car.querySelector('.qc-prev');
    var next = car.querySelector('.qc-next');
    if (!track) return;

    var stepBy = function () {
      var card = track.querySelector('.quote');
      return card ? card.getBoundingClientRect().width + 18 : 300;
    };
    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 4;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -stepBy(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: stepBy(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(pointer: fine)').matches;
    if (!reduce && fine) {
      var dir = 0, raf = null;
      var loop = function () {
        if (!dir) { raf = null; return; }
        track.scrollLeft += dir * 7;
        update();
        raf = window.requestAnimationFrame(loop);
      };
      track.addEventListener('mousemove', function (e) {
        var r = track.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        dir = x < 0.15 ? -1 : x > 0.85 ? 1 : 0;
        if (dir && !raf) raf = window.requestAnimationFrame(loop);
      });
      track.addEventListener('mouseleave', function () { dir = 0; });
    }
  });

  /* --- Link activo en el nav según la sección visible --------------- */
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        links.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
