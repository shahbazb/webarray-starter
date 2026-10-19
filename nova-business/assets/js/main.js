/* ==========================================================================
   Nova Business HTML Template by WebArray: main script
   Plain JavaScript. Animations use GSAP (loaded from a CDN in each page).
   If GSAP fails to load, or the visitor prefers reduced motion, the site
   still works: content stays visible and only the motion is skipped.

   Sections in this file:
     1. Setup
     2. Mobile menu
     3. Footer year
     4. Contact form (validation + demo mode)
     5. Clothesline testimonials (scroll, drag, arrows)
     6. Animations (only when GSAP is available and motion is allowed)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Setup ---------- */
  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";
  var motion = hasGsap && !prefersReducedMotion;
  if (motion) root.classList.add("js-motion");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  // Resolves once web fonts are ready (or after 1.2 s), so text splitting measures the right font
  var fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(function (r) { setTimeout(r, 1200); })
  ]);

  /* ---------- 2. Mobile menu ---------- */
  var menuBtn = $(".menu-btn");
  var mobileMenu = $("#mobile-menu");
  if (menuBtn && mobileMenu) {
    var setMenu = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      $(".menu-btn__open", menuBtn).setAttribute("display", open ? "none" : "inline");
      $(".menu-btn__close", menuBtn).setAttribute("display", open ? "inline" : "none");
      mobileMenu.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
    });
    // Close when a link inside is used (also covers same-page anchors like #faq)
    $$("a", mobileMenu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) { if (e.matches) setMenu(false); });

    // Services accordion inside the mobile menu
    $$(".mobile-menu__toggle", mobileMenu).forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        panel.hidden = !open;
      });
    });
  }

  /* ---------- 3. Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- 4. Contact form ----------
     data-demo="true"  : validates, then explains that nothing was sent (honest demo).
     data-demo="false" : validates, then POSTs to the form's action URL (e.g. Formspree). */
  var form = $("[data-contact-form]");
  if (form) {
    var status = $(".form-status", form);

    // Preselect the topic when arriving from a package button (contact.html?package=grow)
    var pkg = new URLSearchParams(window.location.search).get("package");
    var topic = form.elements.topic;
    if (pkg && topic && topic.querySelector('option[value="' + pkg.replace(/[^a-z0-9-]/gi, "") + '"]')) topic.value = pkg;

    var messages = {
      name: "Enter your name.",
      email: "Enter an email address like name@example.com.",
      topic: "Choose a topic so we can route your message.",
      message: "Write a short message (at least 10 characters)."
    };
    var showError = function (field, text) {
      var id = field.id + "-error";
      var err = document.getElementById(id);
      if (!err) {
        err = document.createElement("p");
        err.className = "field__error";
        err.id = id;
        field.parentNode.appendChild(err);
      }
      err.textContent = text;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", id);
    };
    var clearError = function (field) {
      var err = document.getElementById(field.id + "-error");
      if (err) err.remove();
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    };
    var showStatus = function (title, text) {
      status.innerHTML = "";
      var strong = document.createElement("strong");
      strong.textContent = title;
      var p = document.createElement("p");
      p.textContent = text;
      status.appendChild(strong);
      status.appendChild(p);
      status.hidden = false;
      status.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
    };

    $$("input, select, textarea", form).forEach(function (field) {
      field.addEventListener("input", function () { if (field.getAttribute("aria-invalid")) clearError(field); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = null;
      $$("input, select, textarea", form).forEach(function (field) {
        clearError(field);
        if (!field.checkValidity()) {
          showError(field, messages[field.name] || "Check this field.");
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      var name = form.elements.name.value.trim();
      if (form.dataset.demo !== "false") {
        showStatus("Thanks, " + name + ". This form is a demo, so nothing was sent.",
          "To reach the team now, use the email address or phone number on this page. Site owners: see README.md to connect the form.");
        return;
      }

      var button = $("button[type=submit]", form);
      button.disabled = true;
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          form.reset();
          showStatus("Thanks, " + name + ". Your message was sent.", "We reply within one working day.");
        })
        .catch(function () {
          showStatus("Your message could not be sent.", "Please try again in a moment, or contact us by email or phone.");
        })
        .then(function () { button.disabled = false; });
    });
  }

  /* ---------- 5. Clothesline testimonials ---------- */
  var line = $("[data-clothesline]");
  var lineApi = null;
  if (line) {
    var track = $(".clothesline__track", line);
    var linePath = $(".clothesline__line path", line);
    var tags = $$(".tag", line);

    // The line is pinned at each peg and dips between them
    var drawLine = function () {
      var tr = track.getBoundingClientRect();
      var pegs = tags.map(function (t) {
        var p = $(".tag__peg", t).getBoundingClientRect();
        return p.left + p.width / 2 - tr.left;
      });
      var y = 26, sag = 16;
      var pts = [-40].concat(pegs, [tr.width + 40]);
      var d = "M" + pts[0] + "," + (y - 8);
      for (var i = 1; i < pts.length; i++) {
        var mid = (pts[i - 1] + pts[i]) / 2;
        d += " Q" + mid + "," + (y + sag) + " " + pts[i] + "," + (i === pts.length - 1 ? y - 8 : y);
      }
      linePath.setAttribute("d", d);
    };
    drawLine();
    fontsReady.then(drawLine);
    window.addEventListener("resize", drawLine);

    var step = function () { return (tags[0].offsetWidth + 32) * 1.5; };
    var scrollLine = function (dir) { line.scrollBy({ left: dir * step(), behavior: prefersReducedMotion ? "auto" : "smooth" }); };
    var back = $("[data-line-back]");
    var forward = $("[data-line-forward]");
    if (back) back.addEventListener("click", function () { scrollLine(-1); });
    if (forward) forward.addEventListener("click", function () { scrollLine(1); });

    // Drag with the mouse (touch devices scroll natively)
    var dragging = false, startX = 0, startLeft = 0;
    line.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      dragging = true; startX = e.clientX; startLeft = line.scrollLeft;
      line.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) { if (dragging) line.scrollLeft = startLeft - (e.clientX - startX); });
    window.addEventListener("pointerup", function () { dragging = false; line.classList.remove("is-dragging"); });
    lineApi = { line: line, track: track, path: linePath, tags: tags };
  }

  /* ---------- 6. Animations ---------- */
  if (!motion) return;

  var plugins = [window.ScrollTrigger, window.SplitText, window.MorphSVGPlugin, window.DrawSVGPlugin].filter(Boolean);
  gsap.registerPlugin.apply(gsap, plugins);
  var canSplit = !!window.SplitText, canMorph = !!window.MorphSVGPlugin, canDraw = !!window.DrawSVGPlugin;
  if (!window.ScrollTrigger) return; // every scene below is scroll-driven

  // Headline reveal: words stay whole so long words never break mid-word
  var revealHeading = function (el) {
    if (!canSplit) return;
    gsap.set(el, { autoAlpha: 0 });
    fontsReady.then(function () {
      SplitText.create(el, {
        type: "lines,words,chars", mask: "lines", autoSplit: true,
        onSplit: function (self) {
          gsap.set(el, { autoAlpha: 1 });
          return gsap.from(self.chars, { yPercent: 120, rotate: 6, duration: 1, stagger: 0.02, ease: "power4.out" });
        }
      });
    });
  };
  $$("[data-split], .hero .display").forEach(revealHeading);

  // Counters: count up to data-count when scrolled into view
  $$("[data-count]").forEach(function (el) {
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: Number(el.dataset.count), snap: { textContent: 1 }, duration: 2, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });

  // Blob outlines shared by the home hero and the inner page heroes (500 x 500 space)
  var shapes = [
    "M250,40 C360,40 455,120 455,240 C455,360 370,460 250,460 C130,460 45,370 45,250 C45,130 140,40 250,40Z",
    "M262,48 C380,30 470,140 448,262 C428,380 330,470 220,452 C110,434 30,340 52,226 C74,112 160,62 262,48Z",
    "M240,36 C340,52 470,110 460,236 C450,350 390,470 262,462 C140,454 40,390 44,262 C48,140 130,20 240,36Z",
    "M250,56 C350,30 452,108 452,226 C452,356 380,456 252,456 C122,456 50,376 50,252 C50,150 150,80 250,56Z"
  ];
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Ambient motion engine ----------
     Driven by attributes, so you can add or remove motion in the HTML:
       data-parallax="0.3"   moves at its own speed while scrolling (negative = opposite direction)
       data-float            bobs gently up and down
       data-tilt             tilts toward the mouse pointer
       data-pulse            breathes in and out
       data-reveal           fades up when scrolled into view
         ="scale"  grows in    ="wipe"  wipes open from the left    ="lines"  text rises line by line
       data-stagger          its children cascade in one after another
         ="pop"    children pop in    ="grow"  children grow from the left
     Section headings (.section .h2) rise line by line automatically. */

  // Reading progress bar along the top edge
  var progress = $(".scroll-progress");
  if (progress) gsap.to(progress, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  // Section headings: lines rise out of a mask
  if (canSplit) {
    $$(".section .h2").forEach(function (h) {
      if (h.closest(".showcase") || h.hasAttribute("data-split")) return;
      fontsReady.then(function () {
        SplitText.create(h, {
          type: "lines", mask: "lines", autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: "power3.out",
              scrollTrigger: { trigger: h, start: "top 88%", once: true } });
          }
        });
      });
    });
  }

  $$("[data-reveal]").forEach(function (el) {
    var type = el.dataset.reveal;
    var st = { trigger: el, start: "top 88%", once: true };
    if (type === "lines" && canSplit) {
      fontsReady.then(function () {
        SplitText.create(el, {
          type: "lines", mask: "lines", autoSplit: true,
          onSplit: function (self) { return gsap.from(self.lines, { yPercent: 105, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: st }); }
        });
      });
    } else if (type === "wipe") {
      gsap.fromTo(el, { clipPath: "inset(0% 100% 0% 0% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 32px)", duration: 1.1, ease: "power3.inOut", scrollTrigger: st });
    } else if (type === "scale") {
      gsap.from(el, { scale: 0.94, y: 40, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: st });
    } else {
      gsap.from(el, { y: 30, autoAlpha: 0, duration: 0.9, ease: "power3.out", scrollTrigger: st });
    }
  });

  $$("[data-stagger]").forEach(function (group) {
    var kids = Array.prototype.slice.call(group.children);
    var st = { trigger: group, start: "top 86%", once: true };
    var type = group.dataset.stagger;
    if (type === "grow") gsap.from(kids, { scaleX: 0, transformOrigin: "left center", duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: st });
    else if (type === "pop") gsap.from(kids, { scale: 0.6, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: "back.out(1.8)", scrollTrigger: st });
    else gsap.from(kids, { y: 36, autoAlpha: 0, duration: 0.8, stagger: 0.09, ease: "power3.out", scrollTrigger: st });
  });

  // Parallax: each element drifts across its section at its own speed
  $$("[data-parallax]").forEach(function (el) {
    var dist = (parseFloat(el.dataset.parallax) || 0.2) * 140;
    // Measured against the nearest card/article if there is one, otherwise the whole section
    var area = el.closest("article, section, footer") || el;
    gsap.fromTo(el, { y: -dist }, { y: dist, ease: "none", scrollTrigger: { trigger: area, start: "top bottom", end: "bottom top", scrub: true } });
  });

  $$("[data-float]").forEach(function (el, i) {
    gsap.to(el, { y: "-=12", rotation: i % 2 ? 1.5 : -1.5, duration: gsap.utils.random(2.4, 3.4), ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.25 });
  });

  $$("[data-pulse]").forEach(function (el, i) {
    gsap.to(el, { scale: 1.18, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 });
  });

  // Inner page heroes: the white blob slowly changes shape and the dashed ring turns
  $$(".morph-blob").forEach(function (b) {
    if (!canMorph) return;
    var tl = gsap.timeline({ repeat: -1 });
    shapes.slice(1).concat(shapes[0]).forEach(function (d) { tl.to(b, { morphSVG: d, duration: 3.2, ease: "sine.inOut" }); });
  });
  $$(".spin-ring").forEach(function (r) { gsap.to(r, { rotation: 360, transformOrigin: "50% 50%", duration: 50, ease: "none", repeat: -1 }); });

  // CTA glow orbs drift sideways (the vertical drift comes from data-parallax)
  $$(".cta-band__orb").forEach(function (o, i) {
    gsap.to(o, { x: i ? 60 : -60, scale: 1.15, duration: 6 + i * 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
  });

  // Pointer effects only on devices with a mouse
  if (canHover) {
    $$("[data-tilt]").forEach(function (el) {
      gsap.set(el, { transformPerspective: 900 });
      var rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
      var ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      });
      el.addEventListener("pointerleave", function () { rx(0); ry(0); });
    });

    // Magnetic buttons: lean slightly toward the pointer
    $$(".btn--primary, .btn--light, .icon-btn--solid").forEach(function (b) {
      var xTo = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3" });
      var yTo = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3" });
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        // Small pull, capped at 14px so wide buttons don't wander
        xTo(gsap.utils.clamp(-14, 14, (e.clientX - (r.left + r.width / 2)) * 0.2));
        yTo(gsap.utils.clamp(-8, 8, (e.clientY - (r.top + r.height / 2)) * 0.3));
      });
      b.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  /* Hero: the blob morphs and recolors as it cycles through the service images */
  var stage = $(".hero__stage");
  if (stage) {
    var heroImgs = $$(".hero__img", stage);
    var blob = $(".hero__blob-fill", stage);
    var ring = $(".hero__blob-ring", stage);
    var captionText = $(".hero__caption-text", stage);
    var captionDot = $(".hero__caption-dot", stage);
    gsap.from(stage, { scale: 0.85, autoAlpha: 0, duration: 1.1, ease: "expo.out", delay: 0.2 });
    gsap.from([".hero .kicker", ".hero .lede", ".hero .btn-row"], { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.1, delay: 0.5, ease: "power3.out" });

    var current = 0;
    var showHero = function (next) {
      var img = heroImgs[next];
      var tone = img.dataset.tone || "1";
      var tl = gsap.timeline();
      tl.to(heroImgs[current], { autoAlpha: 0, y: -30, rotate: -6, duration: 0.5, ease: "power2.in" })
        .to(blob, { fill: cssVar("--tone-" + tone + "-tint"), duration: 0.8 }, 0.2)
        .to(ring, { stroke: cssVar("--tone-" + tone), duration: 0.6 }, 0.2)
        .to(captionDot, { backgroundColor: cssVar("--tone-" + tone), duration: 0.4 }, 0.3)
        .add(function () { captionText.textContent = img.dataset.caption || ""; }, 0.4)
        .fromTo(img, { autoAlpha: 0, y: 40, rotate: 6 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.8, ease: "back.out(1.6)" }, 0.45);
      if (canMorph) tl.to(blob, { morphSVG: shapes[next % shapes.length], duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0.2);
      current = next;
    };
    if (heroImgs.length > 1) {
      gsap.set(captionDot, { backgroundColor: cssVar("--tone-" + (heroImgs[0].dataset.tone || "1")) });
      gsap.delayedCall(3.2, function cycle() { showHero((current + 1) % heroImgs.length); gsap.delayedCall(3.2, cycle); });
    }
    gsap.to(ring, { rotation: 360, transformOrigin: "50% 50%", duration: 40, ease: "none", repeat: -1 });

    var heroScroll = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
    heroScroll.to(stage, { yPercent: -18, scale: 1.08, ease: "none" }, 0);
    if (canMorph) heroScroll.to(".hero__wave-path", { morphSVG: "M0,40 C200,10 520,90 760,40 C1000,-10 1220,70 1440,30 L1440,120 L0,120Z", ease: "none" }, 0);
  }

  /* Desktop-only scenes: pinned services showcase and process ring */
  var mm = gsap.matchMedia();
  mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, function (ctx) {
    var desktop = ctx.conditions.desktop;

    var showcase = $(".showcase");
    if (showcase && desktop) {
      var sheets = $$(".sheet", showcase);
      var bar = $(".showcase__bar span", showcase);
      gsap.set(sheets.slice(1), { xPercent: 100 });
      var stack = gsap.timeline({
        scrollTrigger: {
          trigger: showcase, pin: true, scrub: 1, invalidateOnRefresh: true,
          end: function () { return "+=" + window.innerHeight * (sheets.length - 1) * 1.1; },
          snap: { snapTo: "labels", duration: 0.5, ease: "power1.inOut" },
          onUpdate: function (self) { gsap.set(bar, { scaleX: self.progress }); }
        }
      });
      stack.addLabel("s0");
      sheets.forEach(function (sheet, i) {
        if (!i) return;
        stack.to(sheet, { xPercent: 0, ease: "power2.inOut", duration: 1 })
          .to(sheets[i - 1], { scale: 0.9, xPercent: -12, borderRadius: 40, ease: "power2.inOut", duration: 1 }, "<")
          .from($(".disc-stage__img", sheet), { rotate: 14, yPercent: 20, ease: "power2.out", duration: 1 }, "<0.15")
          .addLabel("s" + i);
      });
    }

    var process = $(".process");
    if (process) {
      var steps = $$(".process-steps li", process);
      var nodes = $$(".process-node", process);
      var light = function (p) { steps.forEach(function (s, i) { s.classList.toggle("is-on", p >= i / steps.length + 0.02); }); };
      gsap.set(nodes, { scale: 0, transformOrigin: "50% 50%" });
      var pt = gsap.timeline({
        scrollTrigger: desktop
          ? { trigger: process, pin: true, scrub: 1, end: "+=140%", onUpdate: function (self) { light(self.progress); } }
          : { trigger: process, start: "top 70%", end: "bottom 70%", scrub: 1, onUpdate: function (self) { light(self.progress); } }
      });
      if (canDraw) pt.from(".process-ring__progress", { drawSVG: 0, ease: "none", duration: 1 }, 0);
      pt.to(nodes, { scale: 1, ease: "back.out(3)", duration: 0.08, stagger: 0.2 }, 0);
    }

    $$(".service-row").forEach(function (row, i) {
      gsap.from(row, { x: desktop ? 60 : 0, y: desktop ? 0 : 20, autoAlpha: 0, duration: 0.7, delay: i * 0.08, ease: "power3.out",
        scrollTrigger: { trigger: row, start: "top 92%" } });
    });
  });

  /* Hover for the services showcase: the disc grows and the illustration lifts.
     Done here rather than in CSS so it never fights the GSAP slide-in animation. */
  $$(".disc-stage").forEach(function (stage) {
    var img = $(".disc-stage__img", stage);
    var disc = $(".disc-stage__disc", stage);
    stage.addEventListener("mouseenter", function () {
      gsap.to(disc, { clipPath: "circle(48% at 50% 52%)", duration: 0.6, ease: "power3.out" });
      gsap.to(img, { y: -10, rotation: -4, scale: 1.05, duration: 0.6, ease: "back.out(2)" });
    });
    stage.addEventListener("mouseleave", function () {
      gsap.to(disc, { clipPath: "circle(36% at 50% 52%)", duration: 0.5, ease: "power3.inOut" });
      gsap.to(img, { y: 0, rotation: 0, scale: 1, duration: 0.5, ease: "power3.inOut" });
    });
  });
  $$(".service-row").forEach(function (row) {
    row.addEventListener("mouseenter", function () { gsap.to(row, { x: 6, duration: 0.3, ease: "power2.out" }); });
    row.addEventListener("mouseleave", function () { gsap.to(row, { x: 0, duration: 0.3, ease: "power2.out" }); });
  });

  /* Clothesline: line draws in, tags drop onto their pegs, sway, and swing with fast scrolling */
  if (lineApi) {
    var swings = lineApi.tags.map(function (t) { return $(".tag__swing", t); });
    var bodies = lineApi.tags.map(function (t) { return $(".tag__body", t); });
    var entrance = gsap.timeline({ scrollTrigger: { trigger: lineApi.line, start: "top 80%", once: true } });
    if (canDraw) entrance.from(lineApi.path, { drawSVG: 0, duration: 1.1, ease: "power2.inOut" });
    entrance
      .from($$(".tag__peg", lineApi.line), { scaleY: 0, transformOrigin: "50% 0%", stagger: 0.06, duration: 0.3, ease: "back.out(3)" }, 0.5)
      // Fade and drop run on the swing wrapper; gusts only rotate the body, so they can't interrupt the entrance
      .from(swings, { y: -30, autoAlpha: 0, stagger: 0.07, duration: 0.5, ease: "power2.out" }, 0.7)
      .from(bodies, { rotation: function (i) { return i % 2 ? 14 : -14; }, stagger: 0.07, duration: 1.4, ease: "elastic.out(1, 0.35)" }, 0.7);

    swings.forEach(function (s) {
      gsap.to(s, {
        rotation: gsap.utils.random(1.2, 2.6) * (Math.random() < 0.5 ? -1 : 1),
        duration: gsap.utils.random(2.2, 3.4), ease: "sine.inOut", yoyo: true, repeat: -1, delay: gsap.utils.random(0, 2)
      });
    });
    var gust = function (velocity) {
      var kick = gsap.utils.clamp(-14, 14, velocity / 120);
      if (Math.abs(kick) < 1.5) return;
      bodies.forEach(function (b, i) {
        if (b.matches(":hover")) return;
        gsap.to(b, { rotation: kick * (0.7 + (i % 3) * 0.15), duration: 0.25, ease: "power2.out", overwrite: "auto",
          onComplete: function () { gsap.to(b, { rotation: 0, duration: 1.6, ease: "elastic.out(1, 0.3)" }); } });
      });
    };
    ScrollTrigger.create({ trigger: lineApi.line, start: "top bottom", end: "bottom top", onUpdate: function (self) { gust(self.getVelocity()); } });
    var lastLeft = lineApi.line.scrollLeft, lastT = performance.now();
    lineApi.line.addEventListener("scroll", function () {
      var now = performance.now();
      gust(-((lineApi.line.scrollLeft - lastLeft) / Math.max(16, now - lastT)) * 1000);
      lastLeft = lineApi.line.scrollLeft; lastT = now;
    }, { passive: true });
    lineApi.tags.forEach(function (t, i) {
      t.addEventListener("mouseenter", function () { gsap.to(bodies[i], { rotation: 0, y: -6, scale: 1.03, duration: 0.4, ease: "power2.out", overwrite: "auto" }); });
      t.addEventListener("mouseleave", function () { gsap.to(bodies[i], { y: 0, scale: 1, duration: 0.5, ease: "power2.inOut" }); });
    });
  }

  /* Card deck testimonials: drag, buttons or arrow keys flick the top card to the back */
  $$("[data-deck]").forEach(function (section) {
    var deck = $("[data-deck-stack]", section);
    var cards = $$(".deck-card", deck);
    var pos = $("[data-deck-pos]", section);
    var fan = [{ r: 0, x: 0, y: 0, s: 1 }, { r: 5, x: 22, y: 10, s: 0.96 }, { r: -4, x: -20, y: 18, s: 0.92 }];
    var order = cards.map(function (_, i) { return i; });

    var layout = function (animate) {
      order.forEach(function (idx, depth) {
        var f = fan[Math.min(depth, fan.length - 1)];
        var el = cards[idx];
        el.style.zIndex = String(cards.length - depth);
        el.setAttribute("aria-hidden", String(depth !== 0));
        var props = { rotation: f.r, x: f.x, y: f.y, scale: f.s, autoAlpha: depth < 3 ? 1 : 0 };
        if (animate) gsap.to(el, Object.assign({ duration: 0.6, ease: "power3.out" }, props)); else gsap.set(el, props);
      });
      pos.textContent = order[0] + 1;
    };
    var flick = function (dir) {
      var top = cards[order[0]];
      order.push(order.shift());
      gsap.timeline()
        .to(top, { x: dir * 520, rotation: dir * 24, duration: 0.45, ease: "power2.in" })
        .add(function () { top.style.zIndex = "0"; layout(true); });
    };
    var back = function () {
      order.unshift(order.pop());
      gsap.set(cards[order[0]], { x: -520, rotation: -24, autoAlpha: 1 });
      layout(true);
    };

    var startX = 0, dragging = false;
    deck.addEventListener("pointerdown", function (e) { dragging = true; startX = e.clientX; cards[order[0]].setPointerCapture(e.pointerId); });
    deck.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      gsap.set(cards[order[0]], { x: dx, rotation: dx / 18 });
    });
    var end = function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 110) flick(Math.sign(dx)); else layout(true);
    };
    deck.addEventListener("pointerup", end);
    deck.addEventListener("pointercancel", end);
    $("[data-deck-next]", section).addEventListener("click", function () { flick(1); });
    $("[data-deck-prev]", section).addEventListener("click", back);
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); flick(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    });

    layout(false);
    gsap.from(cards, {
      y: 120, rotation: function (i) { return i % 2 ? 12 : -12; }, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: "back.out(1.4)",
      scrollTrigger: { trigger: deck, start: "top 80%", once: true },
      onComplete: function () { layout(true); }
    });
  });
})();
