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
    var bar = document.getElementById('scroll-progress');
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- Animaciones: aparición escalonada y tilt de tarjetas ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    var groups = [
      ['.segments', 90], ['.steps', 110], ['.plan', 120], ['.stats .wrap', 90],
      ['.aud-figures', 90], ['.team', 90], ['.gallery', 90]
    ];
    var staggered = [];
    groups.forEach(function (g) {
      var box = document.querySelector(g[0]);
      if (!box) return;
      box.classList.remove('reveal');
      var kids = Array.prototype.slice.call(box.children);
      kids.forEach(function (k, i) {
        k.classList.remove('reveal');
        k.classList.add('stagger-item');
        k.style.setProperty('--d', (i * g[1]) + 'ms');
      });
      staggered.push({ box: box, kids: kids, total: kids.length * g[1] + 800 });
    });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        sio.unobserve(en.target);
        var s = staggered.filter(function (x) { return x.box === en.target; })[0];
        if (s) playStagger(s);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    // al terminar se devuelven las transiciones propias de cada tarjeta (hover)
    var playStagger = function (s) {
      if (s.done) return;
      s.done = true;
      s.box.classList.add('stagger-in');
      window.setTimeout(function () {
        s.kids.forEach(function (k) { k.classList.remove('stagger-item'); k.style.removeProperty('--d'); });
        s.box.classList.remove('stagger-in');
      }, s.total);
    };
    staggered.forEach(function (s) { sio.observe(s.box); });
    // red de seguridad: nunca dejar contenido oculto
    window.setTimeout(function () { staggered.forEach(playStagger); }, 3500);

    // muro de logos: cada logo entra con su retraso
    var wall = document.querySelector('.brands');
    if (wall) {
      Array.prototype.forEach.call(wall.children, function (t, i) { t.style.setProperty('--d', (i * 55) + 'ms'); });
      wall.classList.add('pre', 'anim');
      var wallDone = false;
      var playWall = function () {
        if (wallDone) return;
        wallDone = true;
        wall.classList.remove('pre');
        window.setTimeout(function () {
          wall.classList.remove('anim');
          Array.prototype.forEach.call(wall.children, function (t) { t.style.removeProperty('--d'); });
        }, wall.children.length * 55 + 900);
      };
      var wio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { wio.disconnect(); playWall(); }
      }, { threshold: 0.1 });
      wio.observe(wall);
      window.setTimeout(playWall, 3500);
    }
  }

  if (fineHover && !reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll('.segment, .format, .member'), function (card) {
      card.addEventListener('mouseenter', function () { card.setAttribute('data-tilt', ''); });
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

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

  /* --- Marcas: abrir sus reels en un modal (con navegación) --------- */
  (function () {
    var modal = document.getElementById('reel-modal');
    var frame = document.getElementById('reel-modal-frame');
    if (!modal || !frame) return;
    var bar = modal.querySelector('.reel-modal-bar');
    var cap = document.getElementById('reel-cap');
    var prev = document.getElementById('reel-prev');
    var next = document.getElementById('reel-next');
    var lastFocus = null, list = [], idx = 0, brand = '';

    var show = function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.instagram.com/reel/' + list[idx] + '/embed';
      f.title = 'Reel de ' + brand;
      f.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('scrolling', 'no');
      frame.innerHTML = '';
      frame.appendChild(f);
      cap.textContent = brand + (list.length > 1 ? ' · ' + (idx + 1) + ' de ' + list.length : '');
      if (list.length > 1) bar.removeAttribute('data-single'); else bar.setAttribute('data-single', '');
    };
    var openReels = function (codes, name) {
      list = codes; idx = 0; brand = name;
      show();
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      lastFocus = document.activeElement;
      var closeBtn = modal.querySelector('.reel-modal-close');
      if (closeBtn) closeBtn.focus();
    };
    var closeReels = function () {
      modal.hidden = true;
      frame.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    var go = function (d) {
      if (list.length < 2) return;
      idx = (idx + d + list.length) % list.length;
      show();
    };

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) closeReels();
    });
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeReels();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.brand-tile[data-reels]'), function (tile) {
      tile.addEventListener('click', function () {
        var codes = (tile.getAttribute('data-reels') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (codes.length) openReels(codes, tile.getAttribute('data-brand') || '');
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

  /* --- Seguidores de Instagram: se leen de data/stats.json ---------- */
  /* Instagram bloquea leer el número directo de su web sin login, así que
     no hay forma de "auto-actualizarlo" desde acá: lo más simple es que
     alguien edite data/stats.json (un solo número) y haga push. Esta función
     toma ese valor y arma el texto y el conteo animado solos. */
  (function () {
    var el = document.getElementById('stat-followers');
    if (!el) return;
    fetch('data/stats.json', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var n = d && Number(d.instagramFollowers);
        if (!n || !isFinite(n) || n <= 0) return;
        var value, suffix;
        if (n >= 1000000) { value = Math.round(n / 100000) / 10; suffix = ' M'; }
        else if (n >= 1000) { value = Math.round(n / 100) / 10; suffix = ' mil'; }
        else { value = n; suffix = ''; }
        var dec = (value % 1 === 0) ? 0 : 1;
        var numStr = (dec ? value.toFixed(1) : String(Math.round(value))).replace('.', ',');
        el.textContent = numStr + (suffix ? ' ' + suffix.trim() : '');
        el.setAttribute('data-count-to', String(value));
        el.setAttribute('data-count-dec', String(dec));
        el.setAttribute('data-count-suffix', suffix);
      })
      .catch(function () { /* si falla, queda el valor fijo que ya está en el HTML */ });
  })();

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
          if (d.airedOn && d.airedOn === ymdBA()) {
            // Es de hoy: si todavía no llegó el horario, avisamos; si ya pasó
            // (esté en vivo, recién terminado o ya publicado entero), no decimos
            // "estreno 16 h" porque induce a error.
            status.textContent = buenosAiresNow().getHours() < 16 ? 'Hoy a las 16 h' : 'Programa de hoy';
          } else if (d.airedOn) {
            status.textContent = 'Emisión del ' + fmtAired(d.airedOn);
          } else {
            status.textContent = 'Última emisión';
          }
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
