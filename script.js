// --- 0. USTAWIENIA I POMOCNICZE ---
const isMobile = window.matchMedia("(max-width: 767px)").matches;
const isEditor =
  typeof Webflow !== "undefined" && Webflow.env("editor") !== undefined;
const supportsRIC = "requestIdleCallback" in window;
const runIdle = (cb, timeout = 120) =>
  supportsRIC ? requestIdleCallback(cb, { timeout }) : setTimeout(cb, timeout);

const throttleRaf = (fn) => {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
};

// --- 1. DETEKCJA + STAN LOADERA ---
window.isLoaderRunning = true;
window.lenis = null;

// --- 2. BLOKADA SCROLLA (tylko desktop) ---
if (!isMobile) {
  if (history.scrollRestoration) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  function preventScrollEvents(e) {
    if (window.isLoaderRunning && e.cancelable) {
      e.preventDefault();
      return false;
    }
  }

  function forceScrollTop() {
    if (window.isLoaderRunning) {
      if (!document.hidden) {
        window.scrollTo(0, 0);
        if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
      }
      requestAnimationFrame(forceScrollTop);
    }
  }

  window.addEventListener("wheel", preventScrollEvents, { passive: false });
  window.addEventListener("touchmove", preventScrollEvents, { passive: false });
  requestAnimationFrame(forceScrollTop);
} else {
  // Mobile: bez blokady scrolla
  window.isLoaderRunning = false;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

// --- 3. INICJALIZACJA LENIS (desktop, poza edytorem) ---
if (!isMobile && !isEditor && typeof Lenis !== "undefined") {
  window.lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    infinite: false,
    gestureOrientation: "vertical",
    normalizeWheel: false,
    smoothTouch: false,
  });

  window.lenis.stop();
  window.lenis.scrollTo(0, { immediate: true });

  window.lenis.on("scroll", () => {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
  });

  if (typeof gsap !== "undefined" && gsap.ticker) {
    gsap.ticker.add((time) => {
      if (window.lenis) window.lenis.raf(time * 1000);
    });
  }
}

// --- 4. GŁÓWNA KONFIGURACJA PO ZAŁADOWANIU DOM ---
document.addEventListener("DOMContentLoaded", function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  // --- 5. PROXY LENIS -> SCROLLTRIGGER ---
  if (window.lenis) {
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        return arguments.length
          ? window.lenis.scrollTo(value, { immediate: true })
          : window.lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });
  }

  // --- 6. FUNKCJE POMOCNICZE ---
  const lightFadeOnceIO = (selector, opts = {}) => {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    const {
      rootMargin = "0px 0px -20% 0px",
      threshold = 0.2,
      from = { opacity: 0, y: 20 },
      to = { opacity: 1, y: 0, duration: 1.4, ease: "power2.out", stagger: 0 },
    } = opts;

    // Ustaw stany początkowe, aby nie było “przeskoków”
    els.forEach((el) => gsap.set(el, from));

    const observer = new IntersectionObserver(
      (entries, ob) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(entry.target, to);
            ob.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold }
    );

    els.forEach((el) => observer.observe(el));
  };

  // --- 7. HERO ---
  function initHeroAnimation() {
    const heroImg = isMobile
      ? document.querySelector(".img-hero.is-mobile")
      : document.querySelector(".img-hero:not(.is-mobile)");

    const heroText = document.querySelector('[animation-data="text-hero"]');
    const heroButton = document.querySelector('[animation-data="button"]');
    const heroCaption = document.querySelector('[animation-data="caption"]');
    const nav = document.querySelector(".nav_fixed");
    const rectangles = gsap.utils
      .toArray("[animation-rectangle]")
      .sort(
        (a, b) =>
          a.getAttribute("animation-rectangle") -
          b.getAttribute("animation-rectangle")
      );

    // Stany początkowe
    if (nav) gsap.set(nav, { y: "6rem", opacity: 0 });
    if (isMobile) {
      if (heroImg) gsap.set(heroImg, { scale: 1, opacity: 1, zIndex: 100 });
      if (heroText) gsap.set(heroText, { opacity: 0 });
      if (rectangles.length)
        gsap.set(rectangles, { opacity: 0, scale: 1, zIndex: 101 });
    } else {
      if (heroImg)
        gsap.set(heroImg, {
          scale: 2,
          filter: "blur(5px)",
          zIndex: 100,
          transformOrigin: "center center",
        });
      if (heroText) gsap.set(heroText, { filter: "blur(5px)", opacity: 0 });
      if (rectangles.length)
        gsap.set(rectangles, {
          opacity: 0,
          scale: 0.5,
          zIndex: 101,
          transformOrigin: "center center",
        });
    }
    if (heroButton) gsap.set(heroButton, { x: 32, opacity: 0 });
    if (heroCaption) gsap.set(heroCaption, { yPercent: -18, opacity: 0 });

    const safeInit = () => {
      window.isLoaderRunning = false;
      if (!isMobile) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        if (window.lenis) {
          window.lenis.start();
          window.lenis.scrollTo(0, { immediate: true });
        }
      }

      const delay = isMobile ? 80 : 0;
      runIdle(() => {
        if (typeof initPortfolioAnimations === "function")
          initPortfolioAnimations();
      }, delay);
      runIdle(() => {
        if (typeof initSliders === "function") initSliders();
      }, delay + 40);
      runIdle(() => {
        if (typeof initTestimonials === "function") initTestimonials();
      }, delay + 80);
      runIdle(() => {
        if (typeof initGeneralAnimations === "function")
          initGeneralAnimations();
        if (typeof initPopup === "function") initPopup();
        if (typeof initButtonColorLogic === "function") initButtonColorLogic();
        if (typeof initFormAnimations === "function") initFormAnimations();
        ScrollTrigger.refresh();
      }, delay + 120);
    };

    requestAnimationFrame(() => {
      const tl = gsap.timeline({
        delay: isMobile ? 0.08 : 0.35,
        defaults: { force3D: true },
        onComplete: safeInit,
      });

      if (isMobile) {
        if (rectangles.length) {
          tl.to(
            rectangles,
            { opacity: 1, duration: 0.35, stagger: 0.05, ease: "power2.out" },
            0
          );
        }
        tl.to(
          heroCaption,
          { yPercent: 0, opacity: 1, duration: 0.45, ease: "power2.out" },
          0.12
        );
        tl.to(
          heroText,
          { opacity: 1, duration: 0.45, ease: "power2.out" },
          0.24
        );
        if (nav)
          tl.to(
            nav,
            { y: "0rem", opacity: 1, duration: 0.8, ease: "power1.inOut" },
            0.32
          );
        if (heroButton)
          tl.to(
            heroButton,
            { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
            0.32
          );
      } else {
        if (rectangles.length) {
          tl.to(
            rectangles,
            {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              stagger: 0.18,
              ease: "power2.out",
            },
            0
          );
        }
        tl.to(
          heroImg,
          {
            scale: 1,
            filter: "blur(0px)",
            duration: 1.6,
            ease: "power2.inOut",
          },
          0.4
        );
        tl.to(
          heroCaption,
          { yPercent: 0, opacity: 1, duration: 1.0, ease: "power2.out" },
          1.4
        );
        tl.to(
          heroText,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 1.0,
            ease: "power2.out",
          },
          1.6
        );
        if (heroButton)
          tl.to(
            heroButton,
            { x: 0, opacity: 1, duration: 1.0, ease: "power2.out" },
            1.8
          );
        if (nav)
          tl.to(
            nav,
            { y: "0rem", opacity: 1, duration: 1.0, ease: "power1.inOut" },
            2.0
          );
      }
    });
  }

  // --- 8. NAWIGACJA ---
  function initNavigationLogic() {
    const nav = document.querySelector(".nav_fixed");
    const navLinks = Array.from(document.querySelectorAll(".link-block"));
    if (navLinks.length === 0) return;

    const navContainer = navLinks[0].parentElement;
    const sections = navLinks
      .map((a) => {
        const id = a.getAttribute("href");
        return id && id.startsWith("#") ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    let activeIndex = 0;
    let visualIndex = 0;
    let isClicking = false;
    let isHovering = false;

    if (nav) {
      const defaultBottom = getComputedStyle(nav).bottom;
      const hiddenBottom = `-${nav.offsetHeight + 40}px`;
      let lastScrollY = window.scrollY;

      const onScroll = throttleRaf(() => {
        const currentY = window.scrollY;
        if (currentY < 150) {
          nav.style.bottom = defaultBottom;
        } else {
          if (currentY > lastScrollY + 10) nav.style.bottom = hiddenBottom;
          else if (currentY < lastScrollY - 10)
            nav.style.bottom = defaultBottom;
        }
        lastScrollY = currentY;
      });

      window.addEventListener("scroll", onScroll, { passive: true });
      nav.style.transition = "bottom 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    }

    function moveBgTo(targetIndex) {
      if (!navLinks[targetIndex]) return;
      const oldLink = navLinks[visualIndex];
      const newLink = navLinks[targetIndex];
      const oldBg = oldLink.querySelector(".nav-bg");
      const newBg = newLink.querySelector(".nav-bg");

      if (visualIndex !== targetIndex) {
        const direction = targetIndex > visualIndex ? 100 : -100;
        oldLink.classList.remove("link-bg-color");
        if (oldBg)
          gsap.to(oldBg, {
            xPercent: direction,
            opacity: 0,
            duration: 0.35,
            ease: "power2.inOut",
            overwrite: true,
          });
        newLink.classList.add("link-bg-color");
        if (newBg)
          gsap.fromTo(
            newBg,
            { xPercent: -direction, opacity: 1 },
            {
              xPercent: 0,
              opacity: 1,
              duration: 0.35,
              ease: "power2.inOut",
              overwrite: true,
            }
          );
        visualIndex = targetIndex;
      } else {
        newLink.classList.add("link-bg-color");
        if (newBg)
          gsap.to(newBg, {
            xPercent: 0,
            opacity: 1,
            duration: 0.2,
            overwrite: true,
          });
      }
    }

    const updateActiveOnScroll = throttleRaf(() => {
      if (isClicking) return;
      let foundIndex = -1;
      const innerH = window.innerHeight;
      sections.forEach((sec, i) => {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= innerH / 2 && rect.bottom >= innerH / 2) {
          foundIndex = i;
        }
      });
      if (foundIndex !== -1 && foundIndex !== activeIndex) {
        activeIndex = foundIndex;
        if (!isHovering) moveBgTo(activeIndex);
      }
    });

    navLinks.forEach((link, i) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href");
        const targetSec = document.querySelector(targetId);
        if (targetSec) {
          isClicking = true;
          activeIndex = i;
          moveBgTo(i);
          const unlock = () => {
            isClicking = false;
            updateActiveOnScroll();
          };
          if (window.lenis) {
            window.lenis.scrollTo(targetSec, {
              duration: 1.0,
              onComplete: unlock,
            });
          } else {
            targetSec.scrollIntoView({ behavior: "smooth" });
            setTimeout(unlock, 800);
          }
        }
      });
      link.addEventListener("mouseenter", () => {
        if (!isClicking) {
          isHovering = true;
          moveBgTo(i);
        }
      });
    });

    if (navContainer) {
      navContainer.addEventListener("mouseleave", () => {
        isHovering = false;
        if (!isClicking) moveBgTo(activeIndex);
      });
    }

    const initialBg = navLinks[0].querySelector(".nav-bg");
    if (initialBg) gsap.set(initialBg, { xPercent: 0, opacity: 1 });
    navLinks[0].classList.add("link-bg-color");
    window.addEventListener("scroll", updateActiveOnScroll, { passive: true });
  }

  // --- 9. PORTFOLIO ---
  function initPortfolioAnimations() {
    if (isMobile) {
      initPortfolioPaginationMobile();
      initPortfolioAnimationsMobile();
      return;
    }

    // DESKTOP / TABLET (bez zmian)
    gsap.utils.toArray("[data-animation='true']").forEach((element) => {
      const prevElement = element.previousElementSibling;
      const captionWrapper = element.querySelector(".caption-wrapper");
      const orangeBg = element.querySelector(".block-bg-orange");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "top 10%",
          scrub: true,
        },
      });
      tl.fromTo(
        element,
        { width: "82%" },
        { width: "100%", duration: 1, ease: "none" },
        0
      );
      if (prevElement && prevElement.classList.contains("portfolio-block")) {
        const bgElement = prevElement.querySelector(".bg-black");
        if (bgElement)
          tl.fromTo(
            bgElement,
            { backgroundColor: "rgba(0,0,0,0)" },
            { backgroundColor: "rgba(0,0,0,0.75)", duration: 1, ease: "none" },
            0
          );
      }
      if (captionWrapper)
        tl.fromTo(
          captionWrapper,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: "power1.out" },
          0.4
        );
      if (orangeBg)
        tl.fromTo(
          orangeBg,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "center center",
            duration: 0.5,
            ease: "power2.inOut",
          },
          0.5
        );
      const textElements = element.querySelectorAll('[data-animation="text"]');
      textElements.forEach((textElement) => {
        tl.fromTo(
          textElement,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "none" },
          0.7
        );
      });
    });
  }

  // --- MOBILE: paginacja (bez custom tween; korzysta z natywnego scroll/snap) ---
  function initPortfolioPaginationMobile() {
    const wrapper = document.querySelector(".portfolio-wrapper");
    const pagContainer = document.querySelector(".mobile-scroll-paggination");
    if (!wrapper || !pagContainer) return;

    pagContainer.innerHTML = "";
    const slides = Array.from(wrapper.children).filter(
      (el) => el.nodeType === 1
    );
    if (!slides.length) return;

    const dots = slides.map((_, idx) => {
      const dot = document.createElement("div");
      dot.classList.add("paggination");
      if (idx === 0) dot.classList.add("active");
      dot.dataset.index = idx;
      pagContainer.appendChild(dot);
      dot.addEventListener("click", () => {
        const slide = slides[idx];
        if (!slide) return;
        slide.scrollIntoView({
          behavior: "smooth",
          inline: "start",
          block: "nearest",
        });
      });
      return dot;
    });

    const throttleRaf = (fn) => {
      let ticking = false;
      return (...args) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            fn(...args);
            ticking = false;
          });
          ticking = true;
        }
      };
    };

    const updateActive = throttleRaf(() => {
      const viewportCenter = wrapper.scrollLeft + wrapper.clientWidth * 0.5;
      let bestIdx = 0;
      let bestDist = Infinity;
      slides.forEach((slide, idx) => {
        const center = slide.offsetLeft + slide.offsetWidth * 0.5;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      dots.forEach((dot, i) => {
        if (i === bestIdx) dot.classList.add("active");
        else dot.classList.remove("active");
      });
    });

    wrapper.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    updateActive();
  }

  // --- MOBILE: animacje treści, odpalane przy zmianie aktywnego slajdu (bez animacji samego scrolla) ---
  function initPortfolioAnimationsMobile() {
    const wrapper = document.querySelector(".portfolio-wrapper");
    if (!wrapper) return;
    const slides = Array.from(wrapper.children).filter(
      (el) => el.nodeType === 1
    );
    if (!slides.length) return;

    const DUR_CAPTION = 1.8;
    const DUR_BG = 1.8;
    const DUR_TEXT = 1.6;
    const STAGGER_TEXT = 0.4;

    const resetSlide = (slide) => {
      if (!slide) return;
      const captionWrapper = slide.querySelector(".caption-wrapper");
      const orangeBg = slide.querySelector(".block-bg-orange");
      const textElements = slide.querySelectorAll('[data-animation="text"]');
      if (captionWrapper) gsap.set(captionWrapper, { opacity: 0, y: 10 });
      if (orangeBg)
        gsap.set(orangeBg, { scaleX: 0, transformOrigin: "center center" });
      textElements.forEach((el) => gsap.set(el, { opacity: 0, y: 10 }));
    };

    const animateSlide = (slide) => {
      if (!slide) return;
      const captionWrapper = slide.querySelector(".caption-wrapper");
      const orangeBg = slide.querySelector(".block-bg-orange");
      const textElements = slide.querySelectorAll('[data-animation="text"]');
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      if (captionWrapper)
        tl.to(captionWrapper, { opacity: 1, y: 0, duration: DUR_CAPTION }, 0);
      if (orangeBg) tl.to(orangeBg, { scaleX: 1, duration: DUR_BG }, 0.05);
      if (textElements.length) {
        tl.to(
          textElements,
          { opacity: 1, y: 0, duration: DUR_TEXT, stagger: STAGGER_TEXT },
          0.1
        );
      }
    };

    slides.forEach(resetSlide);
    animateSlide(slides[0]);
    let activeIdx = 0;

    const throttleRaf = (fn) => {
      let ticking = false;
      return (...args) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            fn(...args);
            ticking = false;
          });
          ticking = true;
        }
      };
    };

    const onScroll = throttleRaf(() => {
      const viewportCenter = wrapper.scrollLeft + wrapper.clientWidth * 0.5;
      let bestIdx = 0;
      let bestDist = Infinity;
      slides.forEach((slide, idx) => {
        const center = slide.offsetLeft + slide.offsetWidth * 0.5;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      if (bestIdx !== activeIdx) {
        resetSlide(slides[bestIdx]);
        animateSlide(slides[bestIdx]);
        activeIdx = bestIdx;
      }
    });

    wrapper.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  // --- 10. SLIDERY ---
  function initSliders() {
    const durMain = 1.2;
    const durDivider = 2.0;
    const durSocial = 0.9;
    const startFilterDesktop = "blur(10px)";

    // Mobile: per-element IO animacja
    function animatePerElementMobile(block) {
      const elements = [
        ...block.querySelectorAll(".font-size-link, .heading-style-h4"),
        ...block.querySelectorAll(".list-block, .text-caption"),
        ...block.querySelectorAll(".social-link-block"),
        ...block.querySelectorAll(".divider"),
      ];
      if (!elements.length) return;

      elements.forEach((el) => {
        const isDivider = el.classList.contains("divider");
        gsap.set(el, {
          opacity: isDivider ? 1 : 0,
          y: isDivider ? 0 : 10,
          filter: "none",
          scaleX: isDivider ? 0 : 1,
          transformOrigin: isDivider ? "left center" : undefined,
          willChange: "opacity, transform",
        });
      });

      const io = new IntersectionObserver(
        (entries, ob) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const isDivider = el.classList.contains("divider");
            ob.unobserve(el);
            gsap.to(el, {
              opacity: 1,
              y: 0,
              scaleX: isDivider ? 1 : 1,
              duration: isDivider ? durDivider : durMain,
              ease: "power2.out",
            });
          });
        },
        { rootMargin: "0px 0px -20% 0px", threshold: 0.2 }
      );

      elements.forEach((el) => io.observe(el));
    }

    // Desktop: oryginalna animacja całego bloku
    function animateContentDesktop(activeBlock) {
      if (!activeBlock) return;
      const titles = activeBlock.querySelectorAll(
        ".font-size-link, .heading-style-h4"
      );
      const bodies = activeBlock.querySelectorAll(".list-block, .text-caption");
      const dividers = activeBlock.querySelectorAll(".divider");
      const socials = activeBlock.querySelectorAll(".social-link-block");

      if (titles.length || bodies.length) {
        gsap.set([titles, bodies], {
          opacity: 0,
          y: 10,
          filter: startFilterDesktop,
        });
      }
      if (dividers.length)
        gsap.set(dividers, {
          scaleX: 0,
          opacity: 1,
          transformOrigin: "left center",
        });
      if (socials.length)
        gsap.set(socials, { opacity: 0, y: 10, filter: startFilterDesktop });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(
        titles,
        { opacity: 1, y: 0, filter: "none", duration: durMain, stagger: 0.2 },
        0
      )
        .to(
          bodies,
          {
            opacity: 1,
            y: 0,
            filter: "none",
            duration: durMain,
            stagger: 0.15,
          },
          "-=0.9"
        )
        .to(
          dividers,
          { scaleX: 1, duration: durDivider, stagger: 0.2 },
          "-=durDivider"
        )
        .to(
          socials,
          {
            opacity: 1,
            y: 0,
            filter: "none",
            duration: durSocial,
            stagger: 0.2,
            ease: "power2.out",
          },
          "-=0.8"
        );
    }

    document.querySelectorAll("[data-slider-group]").forEach((group) => {
      const texts = group.querySelectorAll(".slider-text");
      const inner = group.querySelector(".slider-inner");
      const blocks = group.querySelectorAll(
        ".slider-block, .slider-block-services"
      );
      const connects = group.querySelectorAll("[slider-connect]");
      if (!inner || blocks.length === 0) return;

      function goTo(slide) {
        const targetBlock = blocks[slide];
        if (!targetBlock) return;
        const gap = parseFloat(getComputedStyle(inner).columnGap) || 0;

        gsap.to(inner, {
          x: -slide * (targetBlock.offsetWidth + gap),
          duration: isMobile ? 0.18 : 0.25,
          ease: "power2.out",
          onComplete: () => {
            if (isMobile) animatePerElementMobile(targetBlock);
            else animateContentDesktop(targetBlock);
          },
        });

        texts.forEach((text, i) =>
          i === slide
            ? text.classList.remove("font-opacity-25")
            : text.classList.add("font-opacity-25")
        );
        connects.forEach((el) => {
          const idx = parseInt(el.getAttribute("slider-connect"), 10);
          if (idx === slide) el.classList.remove("font-color-opacity");
          else el.classList.add("font-color-opacity");
        });

        requestAnimationFrame(() => {
          if (isMobile) animatePerElementMobile(targetBlock);
          else animateContentDesktop(targetBlock);
        });
      }

      ScrollTrigger.create({
        trigger: group,
        start: "top 75%",
        onEnter: () => goTo(0),
        once: true,
      });

      texts.forEach((text, i) => text.addEventListener("click", () => goTo(i)));
      gsap.set(inner, { x: 0 });
    });
  }

  // --- 11. TESTIMONIALS ---
  function initTestimonials() {
    const wrapper = document.querySelector(".testimonial-wrapper");
    if (!wrapper) return;
    const slides = wrapper.querySelectorAll(".testimonial-slide");
    const prevArrow = document.querySelector(".testimonial-arrow--prev");
    const nextArrow = document.querySelector(".testimonial-arrow--next");
    let current = 0;

    const getGap = () => {
      const style = getComputedStyle(wrapper);
      return parseFloat(style.columnGap || style.gap || 0) || 0;
    };

    gsap.set(slides, {
      opacity: isMobile ? 1 : 0.4,
      filter: isMobile ? "none" : "blur(5px)",
    });

    function updateSlider() {
      const slidesToShow =
        parseInt(
          getComputedStyle(wrapper).getPropertyValue("--_slider---quantity")
        ) || 1;
      const maxIndex = Math.max(0, slides.length - slidesToShow);
      if (current < 0) current = 0;
      if (current > maxIndex) current = maxIndex;

      const gap = getGap();
      const slideWidth =
        slides[0]?.offsetWidth || wrapper.clientWidth / slidesToShow;
      const offset = -current * (slideWidth + gap); // realny pikselowy offset

      gsap.to(wrapper, {
        x: offset,
        duration: isMobile ? 0.7 : 1.0,
        ease: "power2.inOut",
      });

      slides.forEach((slide, index) => {
        const isVisible = index >= current && index < current + slidesToShow;
        gsap.to(slide, {
          filter: isMobile ? "none" : isVisible ? "blur(0px)" : "blur(5px)",
          opacity: isVisible ? 1 : 0.4,
          duration: isMobile ? 0.6 : 1.0,
        });
      });

      if (prevArrow) prevArrow.classList.toggle("is-active", current > 0);
      if (nextArrow)
        nextArrow.classList.toggle("is-active", current < maxIndex);
    }

    if (prevArrow)
      prevArrow.addEventListener("click", () => {
        current--;
        updateSlider();
      });
    if (nextArrow)
      nextArrow.addEventListener("click", () => {
        current++;
        updateSlider();
      });
    window.addEventListener("resize", throttleRaf(updateSlider));
    updateSlider();
  }

  // --- 12. OGÓLNE ANIMACJE ---
  function initGeneralAnimations() {
    if (isMobile) {
      lightFadeOnceIO('[text-animation="true"]', {
        from: { opacity: 0, y: 20 },
        to: { opacity: 1, y: 0, duration: 2.4, ease: "power2.out" },
      });
      if (document.querySelectorAll("[data-offer]").length) {
        lightFadeOnceIO("[data-offer]", {
          from: { opacity: 0, y: 40 },
          to: {
            opacity: 1,
            y: 0,
            duration: 2.4,
            ease: "power2.out",
            stagger: 0.35,
          },
        });
      }
      return;
    }

    document.querySelectorAll('[text-animation="true"]').forEach((el) => {
      const startVars = { y: 20, opacity: 0, filter: "blur(5px)" };
      const endVars = {
        y: 0,
        opacity: 1,
        duration: 1.4,
        filter: "blur(0px)",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      };
      gsap.fromTo(el, startVars, endVars);
    });

    const offerElements = document.querySelectorAll("[data-offer]");
    if (offerElements.length > 0) {
      const sorted = Array.from(offerElements).sort(
        (a, b) => a.getAttribute("data-offer") - b.getAttribute("data-offer")
      );
      const startVars = { opacity: 0, y: 40, filter: "blur(5px)" };
      const endVars = {
        opacity: 1,
        y: 0,
        duration: 1.4,
        stagger: 0.35,
        filter: "blur(0px)",
        scrollTrigger: {
          trigger: ".padding-top-6",
          start: "top 80%",
          once: true,
        },
      };
      gsap.fromTo(sorted, startVars, endVars);
    }
  }

  // --- 13. POPUP ---
  function initPopup() {
    const openBtns = document.querySelectorAll('[data-popup="open"]');
    const closeBtn = document.querySelector('[data-popup="close"]');
    const section = document.querySelector('[data-popup="section"]');
    const popupBlock = document.querySelector('[data-popup="block"]');
    const heroBtn = document.querySelector('[animation-data="button"]');
    if (!section || openBtns.length === 0) return;

    gsap.set(section, { display: "none", opacity: 0 });
    gsap.set([closeBtn, popupBlock], {
      x: 80,
      opacity: 0,
      filter: isMobile ? "none" : "blur(10px)",
    });

    const closePopup = () => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(section, { display: "none" });
          if (window.lenis) window.lenis.start();
        },
      });
      tl.to([closeBtn, popupBlock], {
        x: 50,
        opacity: 0,
        filter: isMobile ? "none" : "blur(10px)",
        duration: 0.35,
        stagger: -0.1,
      })
        .to(section, { opacity: 0, duration: 0.25 })
        .to([openBtns, heroBtn], { opacity: 1, duration: 0.35 }, "-=0.15");
    };

    openBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.lenis) window.lenis.stop();
        const tl = gsap.timeline();
        tl.to([btn, heroBtn], { opacity: 0, duration: 0.25 })
          .set(section, { display: "flex" })
          .to(section, { opacity: 1, duration: 0.45 }, "-=0.4")
          .to(
            [popupBlock, closeBtn],
            {
              x: 0,
              opacity: 1,
              filter: isMobile ? "none" : "blur(0px)",
              duration: 0.6,
              stagger: 0.08,
            },
            "-=0.2"
          );
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", closePopup);
    section.addEventListener("click", (e) => {
      if (e.target === section) closePopup();
    });
  }

  // --- 14. KOLOR PRZYCISKU ---
  function initButtonColorLogic() {
    const fixedBtn = document.querySelector('[button-color="section"]');
    const triggerSection = document.querySelector("#section_portfolio");
    if (!fixedBtn || !triggerSection) return;
    ScrollTrigger.create({
      trigger: triggerSection,
      start: "top 10%",
      onEnter: () =>
        gsap.to(fixedBtn, { backgroundColor: "#fff9f5", duration: 0.35 }),
      onLeaveBack: () =>
        gsap.to(fixedBtn, {
          backgroundColor: "rgba(230, 213, 201, 0.2)",
          duration: 0.35,
        }),
      once: false,
    });
  }

  // --- 15. FORM FIELDS ---
  function initFormAnimations() {
    const fields = document.querySelectorAll(".form-field");
    const form = document.querySelector(".form");
    if (!fields.length || !form) return;
    gsap.to(fields, {
      backgroundSize: "100% 100%",
      duration: isMobile ? 1.0 : 1.6,
      stagger: 0.35,
      scrollTrigger: { trigger: form, start: "top 80%", once: true },
    });
  }
  // --- 16. FORM  ---

  (function () {
    const MAKE_WEBHOOK =
      "https://hook.eu2.make.com/fhty7xo0qdsoza15tv4fsivcw9sawy9l";

    function qs(selector) {
      return document.querySelector(selector);
    }

    function getContainer(form) {
      return form.closest(".form-block") || form.parentElement;
    }

    function findStatusEls(form) {
      const container = getContainer(form);
      const done = container ? container.querySelector(".w-form-done") : null;
      const fail = container ? container.querySelector(".w-form-fail") : null;
      return { done, fail, container };
    }

    function showDone(doneEl, failEl) {
      if (doneEl) doneEl.style.display = "block";
      if (failEl) failEl.style.display = "none";
    }
    function showFail(doneEl, failEl) {
      if (failEl) failEl.style.display = "block";
      if (doneEl) doneEl.style.display = "none";
    }

    function hideFormElement(form) {
      const container = getContainer(form);
      if (container) {
        const emailFormEl = container.querySelector(".email-form");
        if (emailFormEl) {
          emailFormEl.style.display = "none";
          return;
        }
      }
      form.style.display = "none";
    }

    function submitToIframe(form, onSuccess, onFail) {
      const iframeName = "hidden_iframe_" + Date.now();
      const iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      const onLoad = () => {
        cleanup();
        onSuccess && onSuccess();
      };
      const onTimeout = () => {
        cleanup();
        onFail && onFail();
      };

      function cleanup() {
        iframe.removeEventListener("load", onLoad);
        clearTimeout(timeout);
        setTimeout(() => {
          try {
            iframe.parentNode && iframe.parentNode.removeChild(iframe);
          } catch (e) {}
        }, 250);

        form.removeAttribute("target");
      }

      iframe.addEventListener("load", onLoad);
      const timeout = setTimeout(onTimeout, 7000);

      form.setAttribute("target", iframeName);
      form.setAttribute("action", MAKE_WEBHOOK);
      form.setAttribute("method", "POST");
      form.setAttribute("enctype", "multipart/form-data");

      form.submit();
    }

    async function handleSubmit(e, form) {
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const { done, fail } = findStatusEls(form);

      const fd = new FormData(form);

      form.setAttribute("method", "POST");

      try {
        const res = await fetch(MAKE_WEBHOOK, {
          method: "POST",
          body: fd,
          headers: {
            Accept: "application/json",
          },
        });

        if (res.ok) {
          showDone(done, fail);
          hideFormElement(form);
          form.reset();
        } else {
          console.warn("Make responded with status", res.status);
          submitToIframe(
            form,
            () => {
              showDone(done, fail);
              hideFormElement(form);
              form.reset();
            },
            () => {
              showFail(done, fail);
            }
          );
        }
      } catch (err) {
        console.warn("Fetch failed, using iframe fallback:", err);
        submitToIframe(
          form,
          () => {
            showDone(done, fail);
            hideFormElement(form);
            form.reset();
          },
          () => {
            showFail(done, fail);
          }
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    function setupForm(selector) {
      const form = qs(selector);
      if (!form) return;
      if (form.__makeHandlerAttached) return;
      form.__makeHandlerAttached = true;

      form.addEventListener("submit", function (e) {
        handleSubmit(e, form);
      });
    }

    document.addEventListener("DOMContentLoaded", function () {
      setupForm("#email-form");
      setupForm("#email-form-popup");
    });

    window.__setupMakeForms = function () {
      setupForm("#email-form");
      setupForm("#email-form-popup");
    };
  })();

  // --- START ---
  initHeroAnimation();
  initNavigationLogic();
});
