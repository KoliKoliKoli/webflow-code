// --- A ABSOLUTNE WYMUSZENIE GÓRY STRONY ---
if (history.scrollRestoration) {
  history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);

window.lenis = null;
window.isLoaderRunning = true;

document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";

function preventScrollEvents(e) {
  if (window.isLoaderRunning) {
    if (e.cancelable) e.preventDefault();
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

// ---  INICJALIZACJA LENIS ---
if (Webflow.env("editor") === undefined) {
  window.lenis = new Lenis({
    lerp: 0.8,
    wheelMultiplier: 0.8,
    infinite: false,
    gestureOrientation: "vertical",
    normalizeWheel: false,
    smoothTouch: false,
  });

  window.lenis.stop();
  window.lenis.scrollTo(0, { immediate: true });

  // Synchronizacja z GSAP
  window.lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    if (window.lenis) window.lenis.raf(time * 1000);
  });
}

// --- GŁÓWNA INICJALIZACJA PO DOM ---
document.addEventListener("DOMContentLoaded", function () {
  gsap.registerPlugin(ScrollTrigger);

  initHeroAnimation();
  initNavigationLogic();

  function initHeroAnimation() {
  const isMobilePortrait = window.matchMedia("(max-width: 479px)").matches;

  const heroImg = isMobilePortrait
    ? document.querySelector(".img-hero.is-mobile")
    : document.querySelector(".img-hero:not(.is-mobile)");

  const heroText = document.querySelector('[animation-data="text-hero"]');
  const heroButton = document.querySelector('[animation-data="button"]');
  const heroCaption = document.querySelector('[animation-data="caption"]');
  const rectangles = gsap.utils.toArray("[animation-rectangle]").sort((a, b) => a.getAttribute("animation-rectangle") - b.getAttribute("animation-rectangle"));

  // 1. STANY POCZĄTKOWE
  if (isMobilePortrait) {
    // MOBILE: Lekkie stany, brak blura
    if (heroImg) gsap.set(heroImg, { scale: 1, filter: "none", opacity: 1, zIndex: 100 });
    if (heroText) gsap.set(heroText, { filter: "none", opacity: 0 });
    if (rectangles.length) gsap.set(rectangles, { opacity: 0, scale: 1, zIndex: 101 });
  } else {
    // DESKTOP: Oryginalne stany (NIENARUSZONE)
    if (heroImg) gsap.set(heroImg, { scale: 2, filter: "blur(5px)", zIndex: 100, transformOrigin: "center center" });
    if (heroText) gsap.set(heroText, { filter: "blur(5px)", opacity: 0 });
    if (rectangles.length) gsap.set(rectangles, { opacity: 0, scale: 0.5, zIndex: 101, transformOrigin: "center center" });
  }

  if (heroButton) gsap.set(heroButton, { x: 40, opacity: 0 });
  if (heroCaption) gsap.set(heroCaption, { yPercent: -20, opacity: 0 });

  const tl = gsap.timeline({
    delay: isMobilePortrait ? 0.2 : 0.5,
    onComplete: () => {
      window.isLoaderRunning = false;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (window.lenis) { window.lenis.start(); window.lenis.scrollTo(0, { immediate: true }); }
      window.scrollTo(0, 0);

      // Inicjalizacja reszty (odpala się po zakończeniu timeline)
      if (typeof initPortfolioAnimations === "function") initPortfolioAnimations();
      if (typeof initSliders === "function") initSliders();
      if (typeof initTestimonials === "function") initTestimonials();
      if (typeof initGeneralAnimations === "function") initGeneralAnimations();
      if (typeof initPopup === "function") initPopup();
      initButtonColorLogic();
      initFormAnimations();

      setTimeout(() => { ScrollTrigger.refresh(); }, 150);
    },
  });

  // 2. SEKWENCJA ANIMACJI
  if (isMobilePortrait) {
    // --- TIMELINE MOBILE ---
    if (rectangles.length > 0) {
      tl.to(rectangles, { opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }, 0);
    }
    tl.to(heroCaption, { yPercent: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 0.2);
    tl.to(heroText, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.4);
    tl.to(heroButton, { x: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 0.6);
    tl.to({}, { duration: 0.2 }); 

  } else {
    // --- TIMELINE DESKTOP (TWOJA ORYGINALNA ANIMACJA - NIENARUSZONA) ---
    if (rectangles.length > 0) {
      tl.to(rectangles, { opacity: 1, zIndex: 101, scale: 1, duration: 0.6, stagger: 0.2, ease: "power2.out" }, 0);
    }
    tl.to(heroImg, { scale: 1, filter: "blur(0px)", duration: 1.8, ease: "power2.inOut" }, 0.5);
    tl.to(heroCaption, { yPercent: 0, opacity: 1, duration: 1, ease: "power2.out" }, 1.8);
    tl.to(heroText, { filter: "blur(0px)", opacity: 1, duration: 1.2, ease: "power2.out" }, 2.0);
    tl.to(heroButton, { x: 0, opacity: 1, duration: 1.2, ease: "power2.out" }, 2.2);
  }
}

  // B. NAVIGATION (Fixed hide/show + Active States + Hover)
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
      .filter((el) => !!el);

    let activeIndex = 0;
    let visualIndex = 0;
    let isClicking = false;
    let isHovering = false;

    // Show / hidde menu
    if (nav) {
      const defaultBottom = getComputedStyle(nav).bottom;
      const hiddenBottom = `-${nav.offsetHeight + 40}px`;
      let lastScrollY = window.scrollY;

      window.addEventListener(
        "scroll",
        () => {
          const currentY = window.scrollY;
          if (currentY < 150) {
            nav.style.bottom = defaultBottom;
          } else {
            if (currentY > lastScrollY + 10) nav.style.bottom = hiddenBottom;
            else if (currentY < lastScrollY - 10)
              nav.style.bottom = defaultBottom;
          }
          lastScrollY = currentY;
        },
        { passive: true }
      );
      nav.style.transition = "bottom 1.8s cubic-bezier(0.7,0,0.2,1)";
    }

    // 2. Silnik przesuwania tła
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

    // 3. Scroll
    function updateActiveOnScroll() {
      if (isClicking) return;

      let foundIndex = -1;
      const scrollBottom = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;

      if (scrollBottom >= pageHeight - 150) {
        foundIndex = sections.length - 1;
      } else {
        let maxVisibleHeight = 0;
        sections.forEach((sec, i) => {
          const rect = sec.getBoundingClientRect();
          const visibleHeight =
            Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

          if (visibleHeight > 100 && visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            foundIndex = i;
          }
        });
      }

      // AKTUALIZACJA
      if (foundIndex !== -1 && foundIndex !== activeIndex) {
        activeIndex = foundIndex;
        if (!isHovering) moveBgTo(activeIndex);
      }
    }

    // Obsługa Kliknięć
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

          setTimeout(unlock, 1600);

          if (window.lenis) {
            window.lenis.scrollTo(targetSec, {
              duration: 1.2,
              onComplete: unlock,
            });
          } else {
            gsap.to(window, {
              scrollTo: targetSec,
              duration: 1.2,
              ease: "power2.inOut",
              onComplete: unlock,
            });
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

    // Inicjalizacja tła
    const initialBg = navLinks[0].querySelector(".nav-bg");
    if (initialBg) gsap.set(initialBg, { xPercent: 0, opacity: 1 });
    navLinks[0].classList.add("link-bg-color");

    window.addEventListener("scroll", updateActiveOnScroll, { passive: true });
    setTimeout(updateActiveOnScroll, 300);
  }
  // C. PORTFOLIO BLOCKS
  function initPortfolioAnimations() {
    if (!window.matchMedia("(min-width: 768px)").matches) return;

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
          markers: false,
        },
      });

      // Szerokość
      tl.fromTo(
        element,
        { width: "82%" },
        { width: "100%", duration: 1, ease: "none" },
        0
      );

      // 2. Zaciemnianie poprzedniego
      if (prevElement && prevElement.classList.contains("portfolio-block")) {
        const bgElement = prevElement.querySelector(".bg-black");
        if (bgElement) {
          tl.fromTo(
            bgElement,
            { backgroundColor: "rgba(0,0,0,0)" },
            { backgroundColor: "rgba(0,0,0,0.75)", duration: 1, ease: "none" },
            0
          );
        }
      }

      if (captionWrapper) {
        tl.fromTo(
          captionWrapper,
          { filter: "blur(20px)", opacity: 0 },
          {
            filter: "blur(0px)",
            opacity: 1,
            duration: 0.5,
            ease: "power1.out",
          },
          0.4
        );
      }

      if (orangeBg) {
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
      }

      const textElements = element.querySelectorAll('[data-animation="text"]');
      textElements.forEach((textElement) => {
        tl.fromTo(
          textElement,
          { filter: "blur(20px)", opacity: 0 },
          { filter: "blur(0px)", opacity: 1, duration: 0.3, ease: "none" },
          0.7
        );
      });
    });
  }
  // D. MAIN SLIDERS (Services / Team)
  function initSliders() {
    function animateContent(activeBlock) {
      if (!activeBlock) return;

      // Pobieramy elementy TYLKO wewnątrz aktywnego bloku
      const titles = activeBlock.querySelectorAll(
        ".font-size-link, .heading-style-h4"
      );
      const bodies = activeBlock.querySelectorAll(".list-block, .text-caption");
      const dividers = activeBlock.querySelectorAll(".divider");
      const socials = activeBlock.querySelectorAll(".social-link-block");

      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 1.2 },
      });

      // Tytuły i Teksty (Reset i Animacja)
      if (titles.length || bodies.length) {
        gsap.set([titles, bodies], { opacity: 0, y: 10, filter: "blur(10px)" });
        tl.to(
          titles,
          { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.2 },
          0
        ).to(
          bodies,
          { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.15 },
          "-=0.8"
        );
      }

      // Dividery (Reset i Animacja)
      if (dividers.length) {
        gsap.set(dividers, { scaleX: 0, opacity: 1 });
        tl.to(dividers, { scaleX: 1, duration: 2.0, stagger: 0.2 }, "-=2.0");
      }

      // Social Media (Reset i Animacja)
      if (socials.length) {
        gsap.set(socials, {
          opacity: 0,
          y: 10,
          filter: "blur(5px)",
        });

        tl.to(
          socials,
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
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
      const connects = group.querySelectorAll("[slider-connect]");
      const blocks = group.querySelectorAll(
        ".slider-block, .slider-block-services"
      );

      if (!inner || blocks.length === 0) return;

      function goTo(slide, isFirstLoad = false) {
        const targetBlock = blocks[slide];
        if (!targetBlock) return;

        const style = getComputedStyle(inner);
        const gap = parseFloat(style.columnGap || style.gap) || 0;
        const slideWidth = targetBlock.offsetWidth;
        const moveX = -slide * (slideWidth + gap);

        gsap.to(inner, {
          x: moveX,
          duration: 0,
          ease: "power2.inOut",
          onComplete: () => {
            if (!isFirstLoad) animateContent(targetBlock);
          },
        });

        // Obsługa stanów aktywnych tekstu
        texts.forEach((text, i) =>
          i === slide
            ? text.classList.remove("font-opacity-25")
            : text.classList.add("font-opacity-25")
        );

        connects.forEach((el) => {
          const targetSlide = parseInt(el.getAttribute("slider-connect"));
          if (targetSlide === slide) el.classList.remove("font-color-opacity");
          else el.classList.add("font-color-opacity");
        });

        if (isFirstLoad) animateContent(targetBlock);
      }

      // Inicjalizacja przy wejściu w sekcję
      ScrollTrigger.create({
        trigger: group,
        start: "top 75%",
        onEnter: () => goTo(0, true),
        once: true,
      });

      texts.forEach((text, i) => text.addEventListener("click", () => goTo(i)));

      // Reset pozycji startowej
      gsap.set(inner, { x: 0 });
    });
  }

  // E. TESTIMONIAL SLIDER
  function initTestimonials() {
    const wrapper = document.querySelector(".testimonial-wrapper");
    if (!wrapper) return;
    const slides = wrapper.querySelectorAll(".testimonial-slide");
    const prevArrow = document.querySelector(".testimonial-arrow--prev");
    const nextArrow = document.querySelector(".testimonial-arrow--next");
    let current = 0;

    // STAN POCZĄTKOWY
    gsap.set(slides, { filter: "blur(5px)", opacity: 0.4 });

    function updateSlider() {
      const style = getComputedStyle(wrapper);
      const slidesToShow =
        parseInt(style.getPropertyValue("--_slider---quantity")) || 1;
      const slideCount = slides.length;
      const maxIndex = Math.max(0, slideCount - slidesToShow);
      const gap = 1.375;

      if (current < 0) current = 0;
      if (current > maxIndex) current = maxIndex;

      // OBLICZENIA RUCHU
      const movePercent = -(100 / slidesToShow) * current;
      const moveGap = -(gap / slidesToShow) * current;

      // ANIMACJA RUCHU WRAPPERA
      gsap.to(wrapper, {
        xPercent: movePercent,
        x: moveGap + "rem",
        duration: 1.2,
        ease: "power2.inOut",
        overwrite: true,
      });

      // ANIMACJA BLURU DLA KAŻDEGO SLAJDU
      slides.forEach((slide, index) => {
        const isVisible = index >= current && index < current + slidesToShow;

        gsap.to(slide, {
          filter: isVisible ? "blur(0px)" : "blur(5px)",
          opacity: isVisible ? 1 : 0.4,
          duration: 1.2,
          ease: "power1.inOut",
        });
      });

      // Aktualizacja strzałek
      if (prevArrow) prevArrow.classList.toggle("is-active", current > 0);
      if (nextArrow)
        nextArrow.classList.toggle("is-active", current < maxIndex);
    }

    // EVENT LISTENERS
    if (prevArrow) {
      prevArrow.addEventListener("click", () => {
        current--;
        updateSlider();
      });
    }
    if (nextArrow) {
      nextArrow.addEventListener("click", () => {
        current++;
        updateSlider();
      });
    }

    window.addEventListener("resize", () => {
      // Przy resize nie animujemy, tylko przeskakujemy do poprawnej pozycji
      updateSlider();
    });

    // Pierwsze wywołanie ustawiające pozycję startową
    updateSlider();
  }

  // F. GENERAL ANIMATIONS (Text & Offers)
  function initGeneralAnimations() {
    // Text Animation
    const textElements = document.querySelectorAll('[text-animation="true"]');
    textElements.forEach((el) => {
      gsap.fromTo(
        el,
        { y: 20, filter: "blur(5px)", opacity: 0 },
        {
          y: 0,
          filter: "blur(0px)",
          opacity: 1,
          duration: 1.6,
          ease: "expoScale(0.5,7,none)",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    });

    // Offer Animation
    const offerElements = document.querySelectorAll("[data-offer]");
    if (offerElements.length > 0) {
      const sortedOffers = Array.from(offerElements).sort(
        (a, b) => a.getAttribute("data-offer") - b.getAttribute("data-offer")
      );
      gsap.fromTo(
        sortedOffers,
        { opacity: 0, y: 40, filter: "blur(5px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.6,
          stagger: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".padding-top-6",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }
  }

  // G. POPUP LOGIC
  function initPopup() {
    const openBtns = document.querySelectorAll('[data-popup="open"]');
    const closeBtn = document.querySelector('[data-popup="close"]');
    const section = document.querySelector('[data-popup="section"]');
    const popupBlock = document.querySelector('[data-popup="block"]');
    const form = document.querySelector('[data-popup="form"]');
    const heroBtn = document.querySelector('[animation-data="button"]');

    if (!section || openBtns.length === 0) return;

    gsap.set(section, { display: "none", opacity: 0 });
    gsap.set([closeBtn, popupBlock], {
      x: 80,
      opacity: 0,
      filter: "blur(10px)",
    });

    const openPopup = (clickedBtn) => {
      if (window.lenis) window.lenis.stop();
      const tl = gsap.timeline();
      tl.to([clickedBtn, heroBtn], {
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
        delay: 0,
      })
        .set(section, { display: "flex" })
        .to(section, { opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.5")
        .to(
          [popupBlock, closeBtn],
          {
            x: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
          },
          "-=0.2"
        );
    };

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
        filter: "blur(10px)",
        duration: 0.4,
        stagger: -0.1,
        ease: "power2.in",
      })
        .to(section, { opacity: 0, duration: 0.3 })
        .to([openBtns, heroBtn], { opacity: 1, duration: 0.4 }, "-=0.2");
    };

    openBtns.forEach((btn) => {
      btn.addEventListener("click", () => openPopup(btn));
    });

    if (closeBtn) closeBtn.addEventListener("click", closePopup);

    if (form) {
      const formWrapper = form.closest(".w-form");
      if (formWrapper) {
        const successMessage = formWrapper.querySelector(".w-form-done");
        if (successMessage) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              const isVisible =
                window.getComputedStyle(successMessage).display !== "none";
              if (isVisible) {
                setTimeout(closePopup, 1000);
                observer.disconnect();
              }
            });
          });
          observer.observe(successMessage, {
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        }
      }
    }

    section.addEventListener("click", (e) => {
      if (e.target === section) closePopup();
    });
  }
  // H. BUTTON COLOR CHANGE ON SCROLL
  function initButtonColorLogic() {
    const fixedBtn = document.querySelector('[button-color="section"]');
    const triggerSection = document.querySelector("#section_portfolio");

    if (!fixedBtn || !triggerSection) return;

    const activeColor = "#fff9f5";
    const defaultColor = "rgba(230, 213, 201, 0.2)";

    ScrollTrigger.create({
      trigger: triggerSection,
      start: "top 10%",
      onEnter: () =>
        gsap.to(fixedBtn, {
          backgroundColor: activeColor,
          duration: 0.4,
          ease: "power2.out",
        }),

      onLeaveBack: () =>
        gsap.to(fixedBtn, {
          backgroundColor: defaultColor,
          duration: 0.4,
          ease: "power2.out",
        }),
    });
  }
  function initFormAnimations() {
    const fields = document.querySelectorAll(".form-field");
    const form = document.querySelector(".form");

    if (!fields.length || !form) return;

    gsap.to(fields, {
      backgroundSize: "100% 100%",
      duration: 1.2,
      ease: "power2.inOut",
      stagger: 0.4,
      scrollTrigger: {
        trigger: form,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    // Animacja tekstu o polityce prywatności (opcjonalnie)
    const privacyText = document.querySelector(".effect-opacity-75");
    if (privacyText) {
      gsap.from(privacyText, {
        opacity: 0,
        y: 10,
        duration: 1,
        delay: 0.8,
        scrollTrigger: {
          trigger: form,
          start: "top 80%",
        },
      });
    }
  }
  document.addEventListener("DOMContentLoaded", initFormAnimations);
});
