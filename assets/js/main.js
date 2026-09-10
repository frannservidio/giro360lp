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

  /* --- Casos en video: abrir el reel en un modal -------------------- */
  (function () {
    var modal = document.getElementById('reel-modal');
    var frame = document.getElementById('reel-modal-frame');
    if (!modal || !frame) return;
    var lastFocus = null;

    var openReel = function (url, label) {
      var src = url.replace(/\/+$/, '') + '/embed';
      var f = document.createElement('iframe');
      f.src = src;
      f.title = label || 'Reel de Instagram';
      f.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('scrolling', 'no');
      frame.innerHTML = '';
      frame.appendChild(f);
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement;
      var closeBtn = modal.querySelector('.reel-modal-close');
      if (closeBtn) closeBtn.focus();
    };
    var closeReel = function () {
      modal.hidden = true;
      frame.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeReel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeReel();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.videocard[data-url]'), function (card) {
      card.addEventListener('click', function () {
        var url = (card.getAttribute('data-url') || '').trim();
        if (!url || url.indexOf('REEMPLAZAR') !== -1) return;
        openReel(url, card.getAttribute('aria-label'));
      });
    });
  })();

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

  /* --- Línea de tiempo horizontal: flechas + arrastre + rail que se llena --- */
  Array.prototype.forEach.call(document.querySelectorAll('.tl-h'), function (box) {
    var track = box.querySelector('.tl-track');
    var line = box.querySelector('.tl-line');
    var fill = box.querySelector('.tl-line-fill');
    var prev = box.querySelector('.tl-prev');
    var next = box.querySelector('.tl-next');
    if (!track) return;

    var cardW = function () {
      var c = track.querySelector('.tl-card');
      return c ? c.getBoundingClientRect().width : 280;
    };
    var sync = function () {
      var max = track.scrollWidth - track.clientWidth;
      if (fill) fill.style.width = Math.min(track.scrollLeft + track.clientWidth / 2, track.scrollWidth) + 'px';
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
    };
    var layout = function () {
      if (line) line.style.width = track.scrollWidth + 'px';
      sync();
    };
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -cardW(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: cardW(), behavior: 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', layout);
    layout();
    window.setTimeout(layout, 600); // por si el layout cambia al cargar fuentes

    // arrastrar con el mouse
    var down = false, startX = 0, startL = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; startX = e.clientX; startL = track.scrollLeft;
      track.style.cursor = 'grabbing';
    });
    window.addEventListener('pointerup', function () { down = false; track.style.cursor = ''; });
    window.addEventListener('pointermove', function (e) {
      if (down) track.scrollLeft = startL - (e.clientX - startX);
    });
  });

  /* --- En vivo: transmisión de 0221comar / última emisión de Giro 360 --- */
  (function () {
    var frame = document.getElementById('live-frame');
    if (!frame) return;
    var badge = document.getElementById('live-badge');
    var status = document.getElementById('live-status');

    // Hora de Buenos Aires (UTC-3, sin horario de verano)
    var buenosAiresNow = function () {
      var d = new Date();
      return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 3 * 3600000);
    };
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var ymdBA = function () {
      var d = buenosAiresNow();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    // "2026-09-04" -> "jueves 4/9"
    var fmtAired = function (iso) {
      var p = (iso || '').split('-');
      if (p.length !== 3) return '';
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return DIAS[d.getDay()] + ' ' + (+p[2]) + '/' + (+p[1]);
    };
    var enFranja = function () {
      var d = buenosAiresNow(), day = d.getDay(), h = d.getHours();
      return (day === 2 || day === 4) && h >= 16 && h < 18;
    };
    var proximoVivo = function () {
      var d = buenosAiresNow(), day = d.getDay();
      // días hasta el próximo martes(2) o jueves(4)
      var opts = [2, 4].map(function (t) { return (t - day + 7) % 7; });
      var min = Math.min.apply(null, opts.filter(function (x) { return x > 0 || (x === 0 && d.getHours() < 16); }));
      if (day === 2 || day === 4) { if (d.getHours() < 16) min = 0; }
      if (min === 0) return 'hoy 16 h';
      if (min === 1) return 'mañana 16 h';
      return 'en ' + min + ' días';
    };

    var embed = function (id) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
      f.title = 'Giro 360';
      f.loading = 'lazy';
      f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      f.setAttribute('allowfullscreen', '');
      frame.innerHTML = '';
      frame.appendChild(f);
    };

    var fallback = function () {
      if (badge) {
        badge.textContent = enFranja()
          ? 'Estamos al aire — miralo en YouTube'
          : 'Próximo vivo: ' + proximoVivo() + ' · miralo en YouTube';
      }
    };

    fetch('/api/live', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.videoId) { fallback(); return; }
        embed(d.videoId);
        if (d.mode === 'live') {
          frame.classList.add('is-live');
          if (status) { status.textContent = 'En vivo ahora'; status.classList.add('on'); }
        } else if (status) {
          if (d.airedOn && d.airedOn === ymdBA()) status.textContent = 'Programa de hoy';
          else if (d.airedOn) status.textContent = 'Emisión del ' + fmtAired(d.airedOn);
          else status.textContent = 'Última emisión';
        }
      })
      .catch(fallback);
  })();

  /* --- Botón flotante de Contacto (mobile) ------------------------- */
  (function () {
    var fab = document.getElementById('fab');
    var contacto = document.getElementById('contacto');
    if (!fab) return;
    var sync = function () {
      var pastHero = window.scrollY > 480;
      var contactoVisible = false;
      if (contacto) {
        var r = contacto.getBoundingClientRect();
        contactoVisible = r.top < window.innerHeight && r.bottom > 0;
      }
      fab.classList.toggle('show', pastHero && !contactoVisible);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  })();

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
