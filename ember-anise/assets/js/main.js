/* Ember & Anise: free restaurant HTML template by WebArray (https://webarray.net). MIT License. */
/* ==========================================================================
   CORE BEHAVIOR (works without GSAP)
   Mobile menu, solid header, scroll progress, menu filter, booking form.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  /* Mobile menu */
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 900) setMenu(false); });

  /* Header turns solid once the hero has scrolled away */
  var hero = document.querySelector('.hero');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-' + 80 + 'px 0px 0px 0px' }).observe(hero);
  } else { header.classList.add('is-solid'); }

  /* Scroll progress bar (plain transform, not animated by GSAP) */
  var bar = document.querySelector('.progress span');
  var ticking = false;
  function updateBar() {
    var max = root.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateBar); }
  }, { passive: true });
  updateBar();

  /* Menu filter. When motion is on, window.__menuFlip animates the change. */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var cats = Array.prototype.slice.call(document.querySelectorAll('.menu-cat'));
  var menuStatus = document.getElementById('menu-status');
  function applyFilter(f) {
    cats.forEach(function (c) { c.hidden = !(f === 'all' || c.dataset.cat === f); });
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      if (window.__menuFlip) window.__menuFlip(f, applyFilter); else applyFilter(f);
      menuStatus.textContent = f === 'all' ? 'Showing the full menu' : 'Showing ' + chip.textContent.trim();
    });
  });

  /* Booking form: validation and an honest demo message */
  var form = document.getElementById('booking');
  var result = document.getElementById('form-result');
  var dateInput = document.getElementById('f-date');
  var phoneLink = '<a href="tel:+15550100148">+1 (555) 010-0148</a>';
  form.noValidate = true;

  function isoToday() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  dateInput.min = isoToday();

  // Sunday is brunch (11:00 to 15:00); other open days are dinner (17:00 to 22:00).
  // Rebuild the time list whenever the date changes.
  (function () {
    var timeSelect = document.getElementById('f-time');
    var two = function (n) { return String(n).padStart(2, '0'); };
    function slots(from, to) {
      var out = [];
      for (var m = from * 60; m <= to * 60; m += 30) out.push(two(Math.floor(m / 60)) + ':' + two(m % 60));
      return out;
    }
    function fillTimes() {
      var v = dateInput.value;
      var sunday = v && new Date(v + 'T12:00:00').getDay() === 0;
      var list = sunday ? slots(11, 14.5) : slots(17, 22);
      var keep = timeSelect.value;
      timeSelect.innerHTML = '<option value="">' + (sunday ? 'Choose a brunch time' : 'Choose a time') + '</option>' +
        list.map(function (t) { return '<option>' + t + '</option>'; }).join('');
      if (list.indexOf(keep) > -1) timeSelect.value = keep;
    }
    dateInput.addEventListener('change', fillTimes);
  })();

  function setError(id, msg) {
    var input = document.getElementById('f-' + id);
    var err = document.getElementById('e-' + id);
    err.innerHTML = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }

  function validate() {
    var v = {
      date: form.date.value, time: form.time.value, guests: form.guests.value,
      name: form.name.value.trim(), contact: form.contact.value.trim()
    };
    var ok = {};
    ok.date = setError('date', !v.date ? 'Please choose a date.' : (v.date < isoToday() ? 'Please choose today or a later date.' : (new Date(v.date + 'T12:00:00').getDay() === 1 ? 'We are closed on Mondays. Please choose another day.' : '')));
    ok.time = setError('time', v.time ? '' : 'Please choose a time.');
    ok.guests = setError('guests', !v.guests ? 'Please choose how many guests.' :
      (v.guests === '9+' ? 'For 9 or more guests, please call us on ' + phoneLink + ' so we can plan the table.' : ''));
    ok.name = setError('name', v.name.length >= 2 ? '' : 'Please enter your name.');
    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contact);
    var digits = v.contact.replace(/\D/g, '');
    var isPhone = /^[+\d\s().-]+$/.test(v.contact) && digits.length >= 7;
    ok.contact = setError('contact', !v.contact ? 'Please enter an email or phone number.' :
      (isEmail || isPhone ? '' : 'Please enter a valid email address or phone number.'));
    var firstBad = ['date', 'time', 'guests', 'name', 'contact'].filter(function (k) { return !ok[k]; })[0];
    return { valid: !firstBad, firstBad: firstBad, name: v.name };
  }

  document.getElementById('f-guests').addEventListener('change', function () {
    if (this.value === '9+') validate();
    else if (this.getAttribute('aria-invalid')) setError('guests', '');
  });

  form.addEventListener('submit', function (e) {
    var r = validate();
    /* With data-demo="false" a valid form is sent to its action URL (your form service) */
    if (r.valid && form.dataset.demo === 'false') return;
    e.preventDefault();
    if (!r.valid) {
      result.hidden = true;
      document.getElementById('f-' + r.firstBad).focus();
      return;
    }
    result.innerHTML = '';
    var strong = document.createElement('strong');
    strong.textContent = 'Thanks, ' + r.name + '. Your details look good.';
    var p = document.createElement('p');
    p.innerHTML = 'This is a demo form, so nothing was sent and no table has been booked. To reserve, please call us on ' + phoneLink + '.';
    result.appendChild(strong);
    result.appendChild(p);
    result.hidden = false;
    result.focus();
    if (window.__spinLemon) window.__spinLemon();
  });
})();

/* ==========================================================================
   MOTION (GSAP). Skipped entirely if GSAP is missing, the 4 second fallback
   fired, or the visitor prefers reduced motion. Each block below is
   independent: delete a block to remove that effect.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce || window.__motionOff) {
    root.classList.remove('js-motion');
    return;
  }
  clearTimeout(window.__motionFallback);
  root.classList.add('js-motion');

  var hasSplit = !!window.SplitText, hasDraw = !!window.DrawSVGPlugin,
      hasMorph = !!window.MorphSVGPlugin, hasFlip = !!window.Flip;
  gsap.registerPlugin.apply(gsap, [ScrollTrigger, window.SplitText, window.DrawSVGPlugin, window.MorphSVGPlugin, window.Flip].filter(Boolean));

  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Wait for fonts so SplitText measures real lines (capped at 1.5s) */
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(init);

  function init() {
    var mm = gsap.matchMedia();

    /* ---------- HERO: the turning platter ---------- */
    var title = document.querySelector('.hero-title');
    var words = [title];
    if (hasSplit) words = SplitText.create(title, { type: 'words', mask: 'words', wordsClass: 'hw' }).words;
    gsap.set(title, { visibility: 'visible' });

    var step = 0;
    var dishIns = gsap.utils.toArray('.tp-dish-in');
    /* The dish facing the headline sits a little larger than the others */
    function highlight(i) {
      gsap.to(dishIns, { scale: function (k) { return k === i ? 1.12 : 0.9; }, transformOrigin: '50% 50%', duration: 1, ease: 'power3.inOut', overwrite: 'auto' });
    }
    function turn() {
      step += 1;
      gsap.to('.tp-turn', { rotation: 90 * step, svgOrigin: '400 400', duration: 1.3, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.to(dishIns, { rotation: -90 * step, transformOrigin: '50% 50%', duration: 1.3, ease: 'power3.inOut', overwrite: 'auto' });
      highlight(step % dishIns.length);
    }

    /* Turns every few seconds; pauses while the pointer is on it or the hero is off screen */
    var auto = gsap.delayedCall(4, function () { turn(); auto.restart(true); });
    var platterEl = document.querySelector('.tp-platter');
    platterEl.addEventListener('pointerenter', function () { auto.pause(); });
    platterEl.addEventListener('pointerleave', function () { auto.restart(true); });
    ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: function (st) { if (st.isActive) auto.restart(true); else auto.pause(); } });

    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(words, { yPercent: 115, rotation: 3, duration: 1.15, stagger: 0.06 })
      .from('.tp-platter', { rotation: -120, scale: 0.7, opacity: 0, transformOrigin: '50% 50%', duration: 1.8 }, 0.1)
      .from(dishIns, { scale: 0, transformOrigin: '50% 50%', duration: 0.9, stagger: 0.12, ease: 'back.out(1.8)' }, 0.8)
      .from('.hero-lead, .hero-actions, .hero-hours', { y: 26, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.5)
      .call(function () { highlight(0); }, null, 1.9);

    /* The dotted ring creeps round, and the platter turns a little as you scroll */
    gsap.to('.tp-ring', { rotation: 360, svgOrigin: '400 400', duration: 90, repeat: -1, ease: 'none' });
    gsap.to('.tp-platter', { rotation: 30, y: 60, transformOrigin: '50% 50%', ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* Parallax layers: data-speed sets how far each layer travels */
    gsap.utils.toArray('[data-speed]').forEach(function (el) {
      gsap.to(el, {
        y: function () { return -parseFloat(el.dataset.speed) * window.innerHeight * 0.5; },
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
    });

    /* ---------- SECTION TITLES: words rise out of a mask ---------- */
    gsap.utils.toArray('.reveal-title').forEach(function (h) {
      var targets = hasSplit ? SplitText.create(h, { type: 'words', mask: 'words', wordsClass: 'rw' }).words : [h];
      gsap.from(targets, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: h, start: 'top 85%' } });
    });

    /* ---------- BUILD THE PLATE ---------- */
    mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, function (ctx) {
      var desk = ctx.conditions.desk;
      var steps = gsap.utils.toArray('.plate-steps li');
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: desk
          ? { trigger: '#plate', start: 'top top', end: '+=200%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true }
          : { trigger: '.plate-stage', start: 'top 70%', toggleActions: 'play none none none' }
      });
      var s = desk ? 1 : 0.42; /* time scale: mobile plays faster */

      gsap.set(steps, { opacity: 0.32 });
      function step(i, at) {
        tl.to(steps[i], { opacity: 1, duration: 0.35 * s, ease: 'power1.out' }, at + 0.55 * s);
      }
      /* Ingredient flies in on a curve: x and y use different eases */
      function fly(target, fx, fy, rot, at) {
        if (desk) {
          tl.from(target, { x: fx, duration: 1, ease: 'power2.out' }, at)
            .from(target, { y: fy, duration: 1, ease: 'power2.in' }, at)
            .from(target, { rotation: rot, scale: 0.75, transformOrigin: '50% 50%', duration: 1, ease: 'power1.out' }, at);
        } else {
          tl.from(target, { y: -70, scale: 0.6, opacity: 0, rotation: rot / 6, transformOrigin: '50% 50%', duration: 0.55, ease: 'back.out(2)' }, at);
        }
      }

      tl.to('.plate-dots', { rotation: 60, svgOrigin: '300 300', duration: 7 * s }, 0);

      fly('#ing-greens', -900, -300, -60, 0);          step(0, 0);
      fly('#ing-bread', 900, -420, 40, 1.1 * s);       step(1, 1.1 * s);
      fly('#ing-feta', -700, -600, -30, 2.2 * s);      step(2, 2.2 * s);
      if (hasMorph) {
        tl.from('#feta-body', { morphSVG: 'M300 280 C314 280 322 290 322 302 C322 314 312 322 300 322 C288 322 278 314 278 302 C278 290 286 280 300 280Z', duration: 0.7 * s, ease: 'power2.out' }, 2.2 * s + 0.75 * s);
      }
      if (hasDraw) tl.from('#feta-swirl', { drawSVG: '0%', duration: 0.5 * s }, 2.2 * s + 1.1 * s);

      /* Pomegranate seeds scatter from above */
      tl.from('#ing-pom .seed', {
        y: desk ? -460 : -90,
        x: function (i) { return (i % 2 ? 1 : -1) * gsap.utils.random(30, desk ? 180 : 60); },
        rotation: function () { return gsap.utils.random(-180, 180); },
        scale: 0, transformOrigin: '50% 50%',
        duration: 0.8 * s, ease: 'power2.out', stagger: { each: 0.035 * s, from: 'random' }
      }, 3.3 * s);
      step(3, 3.3 * s);

      /* Hot honey draws itself */
      if (hasDraw) tl.from('#ing-honey', { drawSVG: '0% 0%', duration: 1.2 * s, ease: 'power1.inOut' }, 4.4 * s);
      else tl.from('#ing-honey', { opacity: 0, duration: 0.6 * s }, 4.4 * s);
      tl.from('#ing-chili rect', { scale: 0, transformOrigin: '50% 50%', duration: 0.3 * s, stagger: 0.08 * s, ease: 'back.out(3)' }, 5.2 * s);
      step(4, 4.4 * s);

      fly('#ing-thyme', 800, -500, 120, 5.6 * s);      step(5, 5.6 * s);

      /* Plate settles, then the dish name lands */
      tl.to('#plate-svg', { scale: 1.04, transformOrigin: '50% 50%', duration: 0.3 * s, ease: 'power2.out' }, 6.7 * s)
        .to('#plate-svg', { scale: 1, duration: 0.6 * s, ease: 'elastic.out(1, 0.45)' }, 7 * s)
        .from('.plate-dish', { y: 30, opacity: 0, duration: 0.6 * s, ease: 'back.out(1.7)' }, 6.9 * s)
        .to({}, { duration: 0.6 * s });
    });

    /* ---------- MENU: tiles cascade in, flip on hover/focus, Flip filter ---------- */
    /* opacity (never visibility) so tiles stay in the keyboard tab order before they animate in */
    var tileItems = gsap.utils.toArray('.tile-item');
    gsap.set(tileItems, { opacity: 0, y: 50, rotationX: -30, transformPerspective: 900, transformOrigin: '50% 0%' });
    ScrollTrigger.batch(tileItems, {
      start: 'top 92%', once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, rotationX: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, overwrite: true });
        gsap.from(batch.map(function (b) { return b.querySelector('.dish'); }), { y: -18, scale: 0.85, transformOrigin: '50% 100%', duration: 0.9, ease: 'back.out(2)', stagger: 0.07, delay: 0.25 });
      }
    });

    document.querySelectorAll('.tile').forEach(function (tile) {
      var inner = tile.querySelector('.tile-inner');
      var flipped = false;
      function turn(on) {
        flipped = on;
        gsap.to(inner, { rotationY: on ? 180 : 0, duration: 0.75, ease: 'back.out(1.3)', overwrite: true });
      }
      tile.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') turn(true); });
      tile.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && document.activeElement !== tile) turn(false); });
      tile.addEventListener('focus', function () {
        gsap.to(tile.closest('.tile-item'), { opacity: 1, y: 0, rotationX: 0, duration: 0.3 });
        turn(true);
      });
      tile.addEventListener('blur', function () { turn(false); });
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(!flipped); }
      });
      /* Touch: a second tap on a turned tile turns it back */
      var wasFocused = false;
      tile.addEventListener('pointerdown', function (e) { wasFocused = e.pointerType !== 'mouse' && document.activeElement === tile; });
      tile.addEventListener('click', function () { if (wasFocused) turn(!flipped); wasFocused = false; });
    });

    if (hasFlip) {
      var wall = document.querySelector('.menu-wall');
      window.__menuFlip = function (f, apply) {
        var catsEls = gsap.utils.toArray('.menu-cat');
        var state = Flip.getState(catsEls);
        wall.style.minHeight = wall.offsetHeight + 'px';
        apply(f);
        Flip.from(state, {
          duration: 0.7, ease: 'power3.inOut', absolute: true,
          onEnter: function (els) {
            gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.15, ease: 'power3.out' });
            els.forEach(function (el) {
              gsap.fromTo(el.querySelectorAll('.tile-item'), { opacity: 0, y: 30, rotationX: -30 },
                { opacity: 1, y: 0, rotationX: 0, duration: 0.6, delay: 0.2, stagger: 0.06, ease: 'power3.out', overwrite: true });
            });
          },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, y: -20, duration: 0.35 }); },
          onComplete: function () {
            wall.style.minHeight = '';
            gsap.set('.menu-cat:not([hidden]) .tile-item', { opacity: 1, y: 0, rotationX: 0 });
            ScrollTrigger.refresh();
          }
        });
      };
    }

    /* ---------- STORY + CHEF: arch art reveal, line reveal, olive branch ---------- */
    gsap.utils.toArray('.arch-art').forEach(function (art) {
      gsap.fromTo(art, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.18 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.4, ease: 'expo.out',
          scrollTrigger: { trigger: art, start: 'top 80%' } });
    });

    gsap.utils.toArray('[data-lines]').forEach(function (p) {
      if (!hasSplit) {
        gsap.from(p, { y: 24, opacity: 0, duration: 0.9, scrollTrigger: { trigger: p, start: 'top 85%' } });
        return;
      }
      SplitText.create(p, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, { yPercent: 105, duration: 0.95, ease: 'power3.out', stagger: 0.09,
            scrollTrigger: { trigger: p, start: 'top 85%' } });
        }
      });
    });

    gsap.from('.day li', { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: '.day', start: 'top 88%' } });

    if (hasDraw) {
      gsap.utils.toArray('.branch-draw').forEach(function (svg) {
        var strokes = svg.querySelectorAll('.bd');
        gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 90%', end: 'top 50%', scrub: 1 } })
          .from(strokes, { drawSVG: '0%', duration: 1, stagger: 0.12 })
          .from(strokes, { fillOpacity: 0, duration: 0.5, stagger: 0.08 }, 0.5)
          .from(svg.querySelectorAll('.bf'), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(3)' }, '-=0.3');
      });
    }

    gsap.from('.chef-sign', { opacity: 0, x: -20, duration: 1, scrollTrigger: { trigger: '.chef-sign', start: 'top 92%' } });

    /* ---------- EXPERIENCES: postcards fan out from a stack ---------- */
    var rest = [-2, 1.5, -1];
    mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, function (ctx) {
      var cards = gsap.utils.toArray('.postcard-wrap');
      if (ctx.conditions.desk) {
        var mid = cards[1];
        gsap.fromTo(cards, {
          x: function (i, el) { return (mid.offsetLeft + mid.offsetWidth / 2) - (el.offsetLeft + el.offsetWidth / 2); },
          y: 90, rotation: function (i) { return [-9, 3, 10][i]; }, scale: 0.92
        }, {
          x: 0, y: 0, scale: 1, rotation: function (i) { return rest[i]; },
          duration: 1.3, ease: 'power3.out', stagger: 0.06,
          scrollTrigger: { trigger: '.postcards', start: 'top 78%', invalidateOnRefresh: true }
        });
      } else {
        gsap.fromTo(cards, { y: 60, opacity: 0, rotation: 0 }, {
          y: 0, opacity: 1, rotation: function (i) { return rest[i] * 0.6; }, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: '.postcards', start: 'top 85%' }, stagger: 0.12
        });
      }
    });

    /* Tilt toward the pointer (fine pointers only) */
    if (finePointer) {
      document.querySelectorAll('.postcard').forEach(function (card) {
        gsap.set(card, { transformPerspective: 900 });
        var rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
        var ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 14);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
        });
        card.addEventListener('pointerleave', function () { rx(0); ry(0); });
      });
    }

    /* ---------- GUEST NOTES: bubbles pop, then bob ---------- */
    gsap.from('.bubble', {
      scale: 0.45, opacity: 0, y: 50, rotation: function (i) { return [-8, 7, -6][i]; },
      transformOrigin: '15% 100%', duration: 0.85, ease: 'back.out(2)', stagger: 0.3,
      scrollTrigger: { trigger: '.bubbles', start: 'top 78%' },
      onComplete: function () {
        gsap.to('.bubble-bob', { y: -7, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.6 });
      }
    });

    /* ---------- RESERVATIONS: card rises, pin drops, lemon spins on success ---------- */
    gsap.from('.form-card', { y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.form-card', start: 'top 85%' } });
    gsap.from('.form-lemon', { rotation: -200, scale: 0, transformOrigin: '50% 50%', duration: 1.2, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.form-card', start: 'top 75%' } });
    gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 82%' } })
      .from('.map-pin', { y: -170, duration: 1, ease: 'bounce.out' })
      .from('.map-ripple', { scale: 0, opacity: 0, svgOrigin: '222 214', duration: 0.6 }, '-=0.35')
      .to('.map-ripple', { scale: 1.6, opacity: 0, svgOrigin: '222 214', duration: 1.4, repeat: -1, ease: 'power1.out' });

    window.__spinLemon = function () {
      gsap.fromTo('.form-lemon', { rotation: 0, scale: 1 }, { rotation: 720, duration: 1.3, ease: 'back.out(1.4)', transformOrigin: '50% 50%' });
      gsap.fromTo('.form-lemon', { scale: 1 }, { scale: 1.25, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.out' });
    };

    /* ---------- DIVIDERS: awnings unroll, cafe lights switch on ---------- */
    gsap.utils.toArray('.awning').forEach(function (aw) {
      gsap.from(aw, { scaleY: 0.15, transformOrigin: '50% 0%', duration: 1.1, ease: 'elastic.out(1, 0.5)',
        scrollTrigger: { trigger: aw, start: 'top 92%' } });
    });
    var bulbs = gsap.utils.toArray('.lights .bulb');
    if (bulbs.length) {
      gsap.set('.lights .bulb-glow', { opacity: 0 });
      gsap.set('.lights .bulb-glass', { fill: '#E9E4D4' });
      gsap.timeline({ scrollTrigger: { trigger: '.lights', start: 'top 85%' } })
        .to('.lights .bulb-glass', { fill: '#F4C430', duration: 0.12, stagger: { each: 0.06, from: 'center' } })
        .to('.lights .bulb-glow', { opacity: 0.28, duration: 0.3, stagger: { each: 0.06, from: 'center' } }, 0)
        .call(function () {
          /* A few bulbs flicker now and then */
          (function flicker() {
            var b = bulbs[Math.floor(Math.random() * bulbs.length)].querySelector('.bulb-glow');
            gsap.fromTo(b, { opacity: 0.05 }, { opacity: 0.28, duration: 0.08, repeat: 3, yoyo: true, ease: 'none' });
            gsap.delayedCall(1.2 + Math.random() * 2, flicker);
          })();
        });
      gsap.to('.lights', { y: 4, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }

    /* ---------- MAGNETIC PRIMARY BUTTONS (capped pull) ---------- */
    if (finePointer) {
      document.querySelectorAll('.btn-primary').forEach(function (btn) {
        var xTo = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3' });
        var yTo = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3' });
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          xTo(gsap.utils.clamp(-8, 8, (e.clientX - (r.left + r.width / 2)) * 0.3));
          yTo(gsap.utils.clamp(-6, 6, (e.clientY - (r.top + r.height / 2)) * 0.3));
        });
        btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
    }

    ScrollTrigger.refresh();
  }
})();
