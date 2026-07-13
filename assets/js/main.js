/* =================================================================
   Allianz Patrimoine — interactions
   Header scroll · menu mobile · rotator · reveal · count-up ·
   cartes empilées (Lenis + GSAP ScrollTrigger).
   Auteur : Nadji
   ================================================================= */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     1. Année du footer
  --------------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------
     2. Header : devient solide après un léger scroll
  --------------------------------------------------------------- */
  const header = document.getElementById("siteHeader");
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 20);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------------------------------------------------------------
     3. Menu mobile (burger)
  --------------------------------------------------------------- */
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });
    // Referme au clic sur un lien
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------------------------------------------------------------
     4. Rotator du hero : mot-clé qui change en boucle
  --------------------------------------------------------------- */
  const words = Array.from(document.querySelectorAll(".rotator-word"));
  if (words.length > 1 && !prefersReduced) {
    let idx = 0;
    setInterval(() => {
      words[idx].classList.remove("is-active");
      idx = (idx + 1) % words.length;
      words[idx].classList.add("is-active");
    }, 2400);
  }

  /* ---------------------------------------------------------------
     5. Reveal au scroll (IntersectionObserver, léger)
  --------------------------------------------------------------- */
  const reveals = document.querySelectorAll(".reveal");
  if (prefersReduced) {
    reveals.forEach((el) => el.classList.add("in-view"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------------------------------------------------------------
     6. Count-up des chiffres-clés (au 1er passage à l'écran)
  --------------------------------------------------------------- */
  const counters = document.querySelectorAll(".stat-num[data-count]");
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    if (prefersReduced) {
      el.textContent = target + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic pour une décélération douce
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window && counters.length) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = el.dataset.count + (el.dataset.suffix || "")));
  }

  /* ---------------------------------------------------------------
     6 bis. Split-text : découpe les titres en mots pour l'anim cascade
     (fait AVANT l'init GSAP ; ne touche pas le rotator du hero)
  --------------------------------------------------------------- */
  const splitTargets = document.querySelectorAll(".section-title, .hero-title");
  const splitNodesFor = new Map(); // titre -> [spans mots]

  const splitIntoWords = (root) => {
    const spans = [];
    // On ne parcourt que les nœuds texte directs et les éléments simples,
    // en laissant intacts les sous-éléments complexes (ex. .rotator du hero).
    const children = Array.from(root.childNodes);
    root.textContent = ""; // on reconstruit
    children.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/); // garde les espaces
        parts.forEach((part) => {
          if (part === "") return;
          if (/^\s+$/.test(part)) {
            root.appendChild(document.createTextNode(part));
          } else {
            const w = document.createElement("span");
            w.className = "split-word";
            w.textContent = part;
            root.appendChild(w);
            spans.push(w);
          }
        });
      } else {
        // Élément (ex. le <span class="rotator">) : on le garde tel quel,
        // mais on l'anime comme un « mot » entier.
        root.appendChild(node);
        node.classList && node.classList.add("split-word");
        spans.push(node);
      }
    });
    return spans;
  };

  if (!prefersReduced) {
    splitTargets.forEach((title) => {
      splitNodesFor.set(title, splitIntoWords(title));
    });
  }

  /* ---------------------------------------------------------------
     7. Smooth scroll (Lenis) — si dispo et mouvement autorisé
  --------------------------------------------------------------- */
  let lenis = null;
  const hasLenis = typeof window.Lenis === "function";
  const isDesktop = window.matchMedia("(min-width: 721px)").matches;

  if (hasLenis && !prefersReduced && isDesktop) {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ---------------------------------------------------------------
     8. Cartes empilées — effets GSAP ScrollTrigger
        (l'empilement lui-même est en CSS via position:sticky ;
         GSAP ajoute le raffinement : scale image, léger parallax
         de titre, marquage de la carte active.)
  --------------------------------------------------------------- */
  const cards = Array.from(document.querySelectorAll(".stack-card"));
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGSAP && !prefersReduced && isDesktop && cards.length) {
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    // Synchronise ScrollTrigger avec Lenis si présent
    if (lenis) {
      lenis.on("scroll", window.ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    cards.forEach((card, i) => {
      const title = card.querySelector(".stack-title");

      // Marque la carte "active" quand elle occupe le centre du viewport :
      // déclenche le scale de l'image (via la classe .is-active en CSS).
      window.ScrollTrigger.create({
        trigger: card,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => card.classList.toggle("is-active", self.isActive),
      });

      // Léger parallax vertical du titre = sensation de profondeur.
      if (title) {
        gsap.fromTo(
          title,
          { y: 26 },
          {
            y: -26,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }

      // Très léger retrait d'échelle des cartes recouvertes : donne
      // l'impression de feuilles qui passent sous les suivantes.
      if (i < cards.length - 1) {
        gsap.to(card, {
          scale: 0.965,
          ease: "none",
          scrollTrigger: {
            trigger: cards[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      }
    });

    // La première carte visible au chargement est active
    if (cards[0]) cards[0].classList.add("is-active");

    /* --- Split-text : mots qui montent + apparaissent en cascade au scroll ---
       immediateRender:false => l'état masqué n'est appliqué QU'À l'entrée du
       trigger (jamais laissé masqué si la section est déjà passée au refresh). */
    splitNodesFor.forEach((wordSpans, title) => {
      gsap.fromTo(
        wordSpans,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.06,
          immediateRender: false,
          scrollTrigger: { trigger: title, start: "top 88%", once: true },
        }
      );
    });

    /* --- Méthode : ligne dorée qui se dessine + cartes en cascade --- */
    const methodTimeline = document.querySelector(".method-timeline");
    if (methodTimeline) {
      const lineFill = methodTimeline.querySelector(".method-line-fill");
      const steps = methodTimeline.querySelectorAll(".method-step");

      if (lineFill) {
        gsap.to(lineFill, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: methodTimeline,
            start: "top 72%",
            end: "bottom 72%",
            scrub: 0.6,
          },
        });
      }
      if (steps.length) {
        gsap.fromTo(
          steps,
          { y: 34, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.14,
            immediateRender: false,
            scrollTrigger: { trigger: methodTimeline, start: "top 78%", once: true },
          }
        );
      }
    }
  } else {
    // Fallback (mobile / reduced / pas de GSAP) : toutes actives, images nettes
    cards.forEach((c) => c.classList.add("is-active"));
    // Titres split : on remet les mots visibles (pas d'anim)
    splitNodesFor.forEach((wordSpans) => {
      wordSpans.forEach((w) => { w.style.opacity = ""; w.style.transform = ""; });
    });
    // Ligne dorée : remplie statiquement pour rester cohérent visuellement
    const lineFill = document.querySelector(".method-line-fill");
    if (lineFill) lineFill.style.transform = "scaleX(1)";
  }

  /* ---------------------------------------------------------------
     8 bis. Slider générique réutilisable (Témoignages + Cibles)
     - largeur des slides pilotée en CSS (flex-basis + --per-view) ;
       le JS lit le nombre de vues visibles pour paginer/positionner.
     - autoplay optionnel (data-autoplay=ms), pause au survol/focus ;
       prefers-reduced-motion -> pas d'autoplay (navigation manuelle OK).
  --------------------------------------------------------------- */
  const initSlider = (root) => {
    const track = root.querySelector(".slider-track");
    const slides = Array.from(track.children);
    const prevBtn = root.querySelector(".slider-prev");
    const nextBtn = root.querySelector(".slider-next");
    const dotsWrap = root.querySelector(".slider-dots");
    const autoplayMs = parseInt(root.dataset.autoplay || "0", 10);
    if (slides.length === 0) return;

    let index = 0;      // index de la slide de tête (fenêtre)
    let perView = 1;    // nb de cartes visibles (lu depuis le CSS)
    let maxIndex = 0;   // index de tête maximal
    let timer = null;

    // Lit --per-view calculé par le CSS (peut être fractionnaire, ex. 1.15)
    const readPerView = () => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue("--per-view"));
      return Number.isFinite(v) && v > 0 ? v : 1;
    };

    const measure = () => {
      perView = readPerView();
      // On borne le défilement pour que la dernière carte reste visible.
      maxIndex = Math.max(0, Math.ceil(slides.length - perView));
      if (index > maxIndex) index = maxIndex;
      buildDots();
      apply();
    };

    const apply = () => {
      // Décalage = index * (largeur d'une slide + gap), en % de la largeur du viewport.
      const first = slides[0];
      const slideW = first.getBoundingClientRect().width;
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      const vpW = root.querySelector(".slider-viewport").getBoundingClientRect().width;
      const offset = index * (slideW + gap);
      track.style.transform = `translateX(${-offset}px)`;
      void vpW; // (mesure conservée pour lisibilité)

      // Slide « courante » = tête de fenêtre (utile pour l'anim du guillemet)
      slides.forEach((s, i) => s.classList.toggle("is-current", i === index));
      // États des dots
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((d, i) =>
          d.classList.toggle("is-active", i === index)
        );
      }
      // Flèches : désactivées aux extrémités (le loop les réactive via go())
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
    };

    const go = (i) => {
      // Boucle infinie : repart au début après la fin, et inversement.
      if (i > maxIndex) i = 0;
      if (i < 0) i = maxIndex;
      index = i;
      apply();
    };

    const buildDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      for (let i = 0; i <= maxIndex; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", `Aller à la position ${i + 1}`);
        b.addEventListener("click", () => { go(i); restart(); });
        dotsWrap.appendChild(b);
      }
    };

    // --- Autoplay (désactivé si reduced-motion ou pas d'intervalle) ---
    const canAuto = autoplayMs > 0 && !prefersReduced;
    const start = () => { if (canAuto && !timer) timer = setInterval(() => go(index + 1), autoplayMs); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const restart = () => { stop(); start(); };

    // Navigation
    if (nextBtn) nextBtn.addEventListener("click", () => { go(index + 1); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { go(index - 1); restart(); });

    // Pause au survol / focus clavier
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    // Recalcule au redimensionnement (per-view change selon breakpoints)
    let rAF;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(measure);
    });

    measure();
    start();
  };

  document.querySelectorAll("[data-slider]").forEach(initSlider);

  /* ---------------------------------------------------------------
     9. Ancres : si Lenis est actif, on gère le scroll fluide vers l'ancre
  --------------------------------------------------------------- */
  if (lenis) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -80 });
        }
      });
    });
  }
})();
