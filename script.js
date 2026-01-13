// --- 1. LEPSZA DEFINICJA MOBILE (Do 767px traktujemy jako mobile) ---
// Zmieniamy z 479px na 767px, aby objąć też duże telefony w poziomie
const isMobile = window.matchMedia("(max-width: 767px)").matches;

// --- A. BLOKADA SCROLLA (LOADER) ---
window.isLoaderRunning = true;
window.lenis = null;

// Blokujemy natywny scroll tylko jeśli to NIE jest mobile
if (!isMobile) {
  if (history.scrollRestoration) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  function preventScrollEvents(e) {
    if (window.isLoaderRunning) {
      if (e.cancelable) e.preventDefault();
      return false;
    }
  }

  // Funkcja wymuszająca górę strony (tylko desktop)
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
  // NA MOBILE: Od razu pozwalamy na wszystko, by uniknąć problemów z "zamrożonym" ekranem
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

// --- B. INICJALIZACJA LENIS (ZOPTYMALIZOWANA) ---
if (Webflow.env("editor") === undefined) {
  // OPTYMALIZACJA: Jeśli to mobile, używamy natywnego scrolla (lżejsze dla baterii)
  // Jeśli bardzo chcesz Lenis na mobile, usuń warunek if (!isMobile).
  // Zalecam jednak zostawić to wyłączenie dla wydajności.

  if (!isMobile) {
    window.lenis = new Lenis({
      lerp: 0.1, // Zwiększyłem płynność (standard to ok 0.1, Ty miałeś 0.8 co jest b. sztywne)
      wheelMultiplier: 1,
      infinite: false,
      gestureOrientation: "vertical",
      normalizeWheel: false,
      smoothTouch: false, // Wyłączamy smoothTouch, bo natywny scroll na iOS/Android jest lepszy
    });

    // Zatrzymujemy Lenis na start (loader)
    window.lenis.stop();
    window.lenis.scrollTo(0, { immediate: true });

    window.lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      if (window.lenis) window.lenis.raf(time * 1000);
    });
  }
}

// --- GŁÓWNA INICJALIZACJA PO DOM ---
document.addEventListener("DOMContentLoaded", function () {
  gsap.registerPlugin(ScrollTrigger);

  // Rejestracja ScrollTriggera z Lenis (jeśli istnieje)
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

  initHeroAnimation();
  initNavigationLogic();

  function initHeroAnimation() {
    // Wybór elementu zależny od nowej definicji isMobile
    const heroImg = isMobile
      ? document.querySelector(".img-hero.is-mobile")
      : document.querySelector(".img-hero:not(.is-mobile)");

    const heroText = document.querySelector('[animation-data="text-hero"]');
    const heroButton = document.querySelector('[animation-data="button"]');
    const heroCaption = document.querySelector('[animation-data="caption"]');
    const rectangles = gsap.utils
      .toArray("[animation-rectangle]")
      .sort(
        (a, b) =>
          a.getAttribute("animation-rectangle") -
          b.getAttribute("animation-rectangle")
      );

    // 1. STANY POCZĄTKOWE
    // Używamy "will-change" dla wydajności
    if (isMobile) {
      // Wersja lekka (bez blur, proste opacity)
      if (heroImg) gsap.set(heroImg, { scale: 1, opacity: 1, zIndex: 100 });
      if (heroText) gsap.set(heroText, { opacity: 0 }); // Usunięty filter: blur
      if (rectangles.length) {
        gsap.set(rectangles, {
          opacity: 0,
          scale: 1,
          zIndex: 101,
          force3D: true,
        });
      }
    } else {
      // Wersja desktop (pełne efekty)
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

    if (heroButton) gsap.set(heroButton, { x: 40, opacity: 0, force3D: true });
    if (heroCaption)
      gsap.set(heroCaption, { yPercent: -20, opacity: 0, force3D: true });

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

      // Zoptymalizowane opóźnienia
      const delay = isMobile ? 100 : 0;

      setTimeout(() => {
        if (typeof initPortfolioAnimations === "function")
          initPortfolioAnimations();
      }, delay);
      setTimeout(() => {
        if (typeof initSliders === "function") initSliders();
      }, delay * 2);
      setTimeout(() => {
        if (typeof initTestimonials === "function") initTestimonials();
      }, delay * 3);
      setTimeout(() => {
        if (typeof initGeneralAnimations === "function")
          initGeneralAnimations();
        if (typeof initPopup === "function") initPopup();
        if (typeof initButtonColorLogic === "function") initButtonColorLogic();
        if (typeof initFormAnimations === "function") initFormAnimations();
        ScrollTrigger.refresh();
      }, delay * 4);
    };

    requestAnimationFrame(() => {
      const tl = gsap.timeline({
        delay: isMobile ? 0.1 : 0.4,
        defaults: { force3D: true },
        onComplete: safeInit,
      });

      if (isMobile) {
        // ANIMACJA MOBILNA (Lekka, bez blur)
        if (rectangles.length > 0) {
          tl.to(
            rectangles,
            { opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" },
            0
          );
        }
        tl.to(
          heroCaption,
          { yPercent: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          0.2
        );
        tl.to(heroText, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.4);
        tl.to(
          heroButton,
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          0.6
        );
      } else {
        // ANIMACJA DESKTOP (Pełna)
        if (rectangles.length > 0) {
          tl.to(
            rectangles,
            {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              stagger: 0.2,
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
            duration: 1.8,
            ease: "power2.inOut",
          },
          0.5
        );
        tl.to(
          heroCaption,
          { yPercent: 0, opacity: 1, duration: 1, ease: "power2.out" },
          1.8
        );
        tl.to(
          heroText,
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 1.2,
            ease: "power2.out",
          },
          2.0
        );
        tl.to(
          heroButton,
          { x: 0, opacity: 1, duration: 1.2, ease: "power2.out" },
          2.2
        );
      }
    });
  }

  // B. NAVIGATION
  function initNavigationLogic() {
    const nav = document.querySelector(".nav_fixed");
    const navLinks = Array.from(document.querySelectorAll(".link-block"));
    if (navLinks.length === 0) return;

    // Reszta logiki bez zmian, działa poprawnie
    const navContainer = navLinks[0].parentElement;
    const sections = navLinks
      .map((a) => {
        const id = a.getAttribute("href");
        return id && id.startsWith("#") ? document.querySelector(id) : null;
      })
      .filter((el) => !!el);

    let activeIndex = 0;
    let visualIndex = 0;
    let isClicking = false;
    let isHovering = false;

    if (nav) {
      const defaultBottom = getComputedStyle(nav).bottom;
      const hiddenBottom = `-${nav.offsetHeight + 40}px`;
      let lastScrollY = window.scrollY;

      // Throttle dla scroll eventu (wydajność)
      let ticking = false;
      window.addEventListener(
        "scroll",
        () => {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const currentY = window.scrollY;
              if (currentY < 150) {
                nav.style.bottom = defaultBottom;
              } else {
                if (currentY > lastScrollY + 10)
                  nav.style.bottom = hiddenBottom;
                else if (currentY < lastScrollY - 10)
                  nav.style.bottom = defaultBottom;
              }
              lastScrollY = currentY;
              ticking = false;
            });
            ticking = true;
          }
        },
        { passive: true }
      );
      nav.style.transition = "bottom 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // Szybsza tranzycja
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
            duration: 0.4,
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
              duration: 0.4,
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

    function updateActiveOnScroll() {
      if (isClicking) return;
      let foundIndex = -1;
      // Prostsza logika dla mobile
      const scrollY = window.scrollY;
      const innerH = window.innerHeight;

      sections.forEach((sec, i) => {
        const rect = sec.getBoundingClientRect();
        // Jeśli środek ekranu jest w sekcji
        if (rect.top <= innerH / 2 && rect.bottom >= innerH / 2) {
          foundIndex = i;
        }
      });

      if (foundIndex !== -1 && foundIndex !== activeIndex) {
        activeIndex = foundIndex;
        if (!isHovering) moveBgTo(activeIndex);
      }
    }

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
              duration: 1.2,
              onComplete: unlock,
            });
          } else {
            // Fallback na natywny smooth scroll jeśli Lenis wyłączony (mobile)
            targetSec.scrollIntoView({ behavior: "smooth" });
            setTimeout(unlock, 1000);
          }
        }
      });
      link.addEventListener("mouseenter", () => {
        if (isClicking) return;
        isHovering = true;
        moveBgTo(i);
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

  // C. PORTFOLIO BLOCKS (Twoja logika była OK - zostawiamy warunek 768px)
  function initPortfolioAnimations() {
    // Upewniamy się, że to działa tylko na większych ekranach
    if (isMobile) return;

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
      // Usunąłem Blur, zostawiłem Opacity
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
        // Usunięty Blur
        tl.fromTo(
          textElement,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "none" },
          0.7
        );
      });
    });
  }

  function initSliders() {
    function animateContent(activeBlock) {
      if (!activeBlock) return;
      const titles = activeBlock.querySelectorAll(
        ".font-size-link, .heading-style-h4"
      );
      const bodies = activeBlock.querySelectorAll(".list-block, .text-caption");
      const dividers = activeBlock.querySelectorAll(".divider");
      const socials = activeBlock.querySelectorAll(".social-link-block");

      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 1.2 },
      });

      // Opcjonalnie: warunek usuwający blur na mobile
      const startFilter = isMobile ? "none" : "blur(10px)";
      const endFilter = "none"; // lub blur(0px)

      if (titles.length || bodies.length) {
        gsap.set([titles, bodies], { opacity: 0, y: 10, filter: startFilter });
        tl.to(
          titles,
          { opacity: 1, y: 0, filter: endFilter, stagger: 0.2 },
          0
        ).to(
          bodies,
          { opacity: 1, y: 0, filter: endFilter, stagger: 0.15 },
          "-=0.8"
        );
      }
      if (dividers.length) {
        gsap.set(dividers, { scaleX: 0, opacity: 1 });
        tl.to(dividers, { scaleX: 1, duration: 2.0, stagger: 0.2 }, "-=2.0");
      }
      if (socials.length) {
        gsap.set(socials, { opacity: 0, y: 10, filter: startFilter });
        tl.to(
          socials,
          {
            opacity: 1,
            y: 0,
            filter: endFilter,
            duration: 0.8,
            stagger: 0.2,
            ease: "power2.out",
          },
          "-=1.2"
        );
      }
    }

    document.querySelectorAll("[data-slider-group]").forEach((group) => {
      const texts = group.querySelectorAll(".slider-text");
      const inner = group.querySelector(".slider-inner");
      const blocks = group.querySelectorAll(
        ".slider-block, .slider-block-services"
      );
      const connects = group.querySelectorAll("[slider-connect]");

      if (!inner || blocks.length === 0) return;

      function goTo(slide, isFirstLoad = false) {
        const targetBlock = blocks[slide];
        if (!targetBlock) return;
        const slideWidth = targetBlock.offsetWidth;
        const gap = parseFloat(getComputedStyle(inner).columnGap) || 0;

        gsap.to(inner, {
          x: -slide * (slideWidth + gap),
          duration: 0.2,
          ease: "power2.out",
          onComplete: () => {
            if (!isFirstLoad) animateContent(targetBlock);
          },
        });

        texts.forEach((text, i) =>
          i === slide
            ? text.classList.remove("font-opacity-25")
            : text.classList.add("font-opacity-25")
        );
        connects.forEach((el) => {
          if (parseInt(el.getAttribute("slider-connect")) === slide)
            el.classList.remove("font-color-opacity");
          else el.classList.add("font-color-opacity");
        });
        if (isFirstLoad) animateContent(targetBlock);
      }

      ScrollTrigger.create({
        trigger: group,
        start: "top 75%",
        onEnter: () => goTo(0, true),
        once: true,
      });
      texts.forEach((text, i) => text.addEventListener("click", () => goTo(i)));
      gsap.set(inner, { x: 0 });
    });
  }

  function initTestimonials() {
    const wrapper = document.querySelector(".testimonial-wrapper");
    if (!wrapper) return;
    const slides = wrapper.querySelectorAll(".testimonial-slide");
    const prevArrow = document.querySelector(".testimonial-arrow--prev");
    const nextArrow = document.querySelector(".testimonial-arrow--next");
    let current = 0;

    // Opty: Na mobile bez blura
    gsap.set(slides, { opacity: 0.4, filter: isMobile ? "none" : "blur(5px)" });

    function updateSlider() {
      const slidesToShow =
        parseInt(
          getComputedStyle(wrapper).getPropertyValue("--_slider---quantity")
        ) || 1;
      const maxIndex = Math.max(0, slides.length - slidesToShow);
      if (current < 0) current = 0;
      if (current > maxIndex) current = maxIndex;

      gsap.to(wrapper, {
        xPercent: -(100 / slidesToShow) * current,
        x: -(1.375 / slidesToShow) * current + "rem",
        duration: 1.2,
        ease: "power2.inOut",
      });

      slides.forEach((slide, index) => {
        const isVisible = index >= current && index < current + slidesToShow;
        gsap.to(slide, {
          filter: isMobile ? "none" : isVisible ? "blur(0px)" : "blur(5px)",
          opacity: isVisible ? 1 : 0.4,
          duration: 1.2,
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
    window.addEventListener("resize", updateSlider);
    updateSlider();
  }

  function initGeneralAnimations() {
    document.querySelectorAll('[text-animation="true"]').forEach((el) => {
      // OPTYMALIZACJA: Usunięcie blur na mobile
      const startVars = { y: 20, opacity: 0 };
      if (!isMobile) startVars.filter = "blur(5px)";

      const endVars = {
        y: 0,
        opacity: 1,
        duration: 1.6,
        scrollTrigger: { trigger: el, start: "top 80%" },
      };
      if (!isMobile) endVars.filter = "blur(0px)";

      gsap.fromTo(el, startVars, endVars);
    });

    const offerElements = document.querySelectorAll("[data-offer]");
    if (offerElements.length > 0) {
      const sorted = Array.from(offerElements).sort(
        (a, b) => a.getAttribute("data-offer") - b.getAttribute("data-offer")
      );

      const startVars = { opacity: 0, y: 40 };
      if (!isMobile) startVars.filter = "blur(5px)";

      const endVars = {
        opacity: 1,
        y: 0,
        duration: 1.6,
        stagger: 0.4,
        scrollTrigger: { trigger: ".padding-top-6", start: "top 80%" },
      };
      if (!isMobile) endVars.filter = "blur(0px)";

      gsap.fromTo(sorted, startVars, endVars);
    }
  }

  function initPopup() {
    // Popup działa OK, jedynie usuwamy BLUR na mobile
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
        duration: 0.4,
        stagger: -0.1,
      })
        .to(section, { opacity: 0, duration: 0.3 })
        .to([openBtns, heroBtn], { opacity: 1, duration: 0.4 }, "-=0.2");
    };

    openBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.lenis) window.lenis.stop();
        const tl = gsap.timeline();
        tl.to([btn, heroBtn], { opacity: 0, duration: 0.3 })
          .set(section, { display: "flex" })
          .to(section, { opacity: 1, duration: 0.5 }, "-=0.5")
          .to(
            [popupBlock, closeBtn],
            {
              x: 0,
              opacity: 1,
              filter: isMobile ? "none" : "blur(0px)",
              duration: 0.8,
              stagger: 0.1,
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

  function initButtonColorLogic() {
    // Bez zmian
    const fixedBtn = document.querySelector('[button-color="section"]');
    const triggerSection = document.querySelector("#section_portfolio");
    if (!fixedBtn || !triggerSection) return;
    ScrollTrigger.create({
      trigger: triggerSection,
      start: "top 10%",
      onEnter: () =>
        gsap.to(fixedBtn, { backgroundColor: "#fff9f5", duration: 0.4 }),
      onLeaveBack: () =>
        gsap.to(fixedBtn, {
          backgroundColor: "rgba(230, 213, 201, 0.2)",
          duration: 0.4,
        }),
    });
  }

  function initFormAnimations() {
    // Bez zmian
    const fields = document.querySelectorAll(".form-field");
    const form = document.querySelector(".form");
    if (!fields.length || !form) return;
    gsap.to(fields, {
      backgroundSize: "100% 100%",
      duration: 1.8,
      stagger: 0.4,
      scrollTrigger: { trigger: form, start: "top 80%" },
    });
  }
});
