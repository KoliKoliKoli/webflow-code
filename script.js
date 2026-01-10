 // --- 1. PRELOADER & SCROLL LOCK (Musi działać natychmiast) ---
  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  
  // Stan blokady scrolla
  window.isLoaderRunning = true;

  // Funkcja blokująca zdarzenia scrolla (wheel/touch)
  function preventScrollEvents(e) {
    if (window.isLoaderRunning) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  // Funkcja wymuszająca pozycję 0,0 (dla starszych przeglądarek/pasków scrolla)
  function forceScrollTop() {
    if (window.isLoaderRunning) {
      window.scrollTo(0, 0);
      requestAnimationFrame(forceScrollTop);
    }
  }

  // Zapinamy blokady natychmiast
  window.scrollTo(0, 0);
  window.addEventListener('wheel', preventScrollEvents, { passive: false });
  window.addEventListener('touchmove', preventScrollEvents, { passive: false });
  requestAnimationFrame(forceScrollTop);


  // --- 2. GŁÓWNA INICJALIZACJA PO ZAŁADOWANIU DOM ---
  document.addEventListener("DOMContentLoaded", function () {
    
    // Rejestracja GSAP raz dla całego projektu
    gsap.registerPlugin(ScrollTrigger);
    
    // Uruchamiamy poszczególne moduły
    initHeroAnimation();
    initNavigationLogic();
    initPortfolioAnimations();
    initSliders();
    initTestimonials();
    initGeneralAnimations(); // Oferta i teksty

    // --- FUNKCJE MODUŁOWE ---

    // A. HERO SECTION & UNLOCK SCROLL
    function initHeroAnimation() {
      const heroImg = document.querySelector('.img-hero');
      const heroText = document.querySelector('[animation-data="text-hero"]');
      const heroButton = document.querySelector('[animation-data="button"]');
      const heroCaption = document.querySelector('[animation-data="caption"]');
      const rectangles = gsap.utils.toArray('[animation-rectangle]').sort((a, b) => 
        a.getAttribute('animation-rectangle') - b.getAttribute('animation-rectangle')
      );
      const body = document.body;

      // Stany początkowe
      gsap.set(heroImg, { scale: 2, filter: 'blur(5px)', zIndex: 999, transformOrigin: "center center" });
      if (heroText) gsap.set(heroText, { filter: 'blur(5px)', opacity: 0 });
      if (heroButton) gsap.set(heroButton, { x: 40, opacity: 0 });
      if (heroCaption) gsap.set(heroCaption, { yPercent: -20, opacity: 0 });
      if (rectangles.length > 0) gsap.set(rectangles, { opacity: 0, scale: 0.5, transformOrigin: "center center" });

      // Timeline
      const tl = gsap.timeline({
        delay: 0.5,
        onComplete: () => {
          // Zdejmij blokady scrolla
          window.isLoaderRunning = false;
          window.removeEventListener('wheel', preventScrollEvents);
          window.removeEventListener('touchmove', preventScrollEvents);
          
          body.style.overflow = 'hidden'; // Chwilowe ukrycie paska, żeby nie mignął
          
          setTimeout(() => {
            body.style.overflow = '';
            // Wymuszenie odświeżenia ScrollTriggera po odblokowaniu strony
            ScrollTrigger.refresh();
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }
      });

      // Sekwencja animacji
      if (rectangles.length > 0) {
        tl.to(rectangles, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.2, ease: "power2.out" }, 0.2);
      }
      tl.to(heroImg, { scale: 1, filter: 'blur(0px)', duration: 1.8, ease: "power2.inOut" }, 0.5);
      
      if (heroCaption) tl.to(heroCaption, { yPercent: 0, opacity: 1, duration: 1, ease: "power2.out" }, 1.8);
      if (heroText) tl.to(heroText, { filter: 'blur(0px)', opacity: 1, duration: 1.2, ease: "power2.out" }, 2.0);
      if (heroButton) tl.to(heroButton, { x: 0, opacity: 1, duration: 1.2, ease: "power2.out" }, 2.2);
    }

    // B. NAVIGATION (Fixed hide/show + Active States + Hover)
    function initNavigationLogic() {
      // 1. Chowanie nawigacji przy scrollu
      const nav = document.querySelector('.nav_fixed');
      if (nav) {
        const defaultBottom = getComputedStyle(nav).bottom;
        const hiddenBottom = `-${nav.offsetHeight + 20}px`;
        let lastScrollY = window.scrollY;
        let ticking = false;

        window.addEventListener('scroll', () => {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const currentY = window.scrollY;
              // Chowaj tylko jak scroll > 2px różnicy
              if (currentY > lastScrollY + 2) nav.style.bottom = hiddenBottom;
              else if (currentY < lastScrollY - 2) nav.style.bottom = defaultBottom;
              lastScrollY = currentY;
              ticking = false;
            });
            ticking = true;
          }
        }, { passive: true });
        
        nav.style.transition = 'bottom 0.7s cubic-bezier(0.7,0,0.2,1)';
        nav.style.bottom = defaultBottom;
      }

      // 2. Active States & Hover (Floating Background)
      const navLinks = Array.from(document.querySelectorAll('.link-block'));
      if (navLinks.length === 0) return;

      const navContainer = navLinks[0].parentElement;
      const sections = navLinks.map(a => {
        const id = a.getAttribute('href');
        return (id && id.startsWith('#')) ? document.querySelector(id) : null;
      }).filter(el => !!el);

      let activeIndex = 0;   
      let visualIndex = 0;   
      let isClicking = false;
      let isHovering = false; 

      // Init background
      const initialBg = navLinks[0].querySelector('.nav-bg');
      if (initialBg) gsap.set(initialBg, { xPercent: 0, opacity: 1 });
      navLinks[0].classList.add("link-bg-color");
      navLinks.forEach((link, i) => {
        if (i !== 0) {
          const bg = link.querySelector('.nav-bg');
          if (bg) gsap.set(bg, { opacity: 0 });
        }
      });

      function moveBgTo(targetIndex) {
        if (targetIndex === visualIndex || !navLinks[targetIndex]) return;
        
        const direction = targetIndex > visualIndex ? 'right' : 'left';
        const exitTo = direction === 'right' ? 100 : -100;
        const enterFrom = direction === 'right' ? -100 : 100;

        // Old Link
        const oldLink = navLinks[visualIndex];
        const oldBg = oldLink.querySelector('.nav-bg');
        oldLink.classList.remove("link-bg-color");
        if(oldBg) gsap.to(oldBg, { xPercent: exitTo, opacity: 0, duration: 0.4, ease: "power2.inOut", overwrite: true });

        // New Link
        const newLink = navLinks[targetIndex];
        const newBg = newLink.querySelector('.nav-bg');
        newLink.classList.add("link-bg-color");
        if(newBg) gsap.fromTo(newBg, { xPercent: enterFrom, opacity: 1 }, { xPercent: 0, opacity: 1, duration: 0.4, ease: "power2.inOut", overwrite: true });

        visualIndex = targetIndex;
      }

      function updateActiveOnScroll() {
        if (isClicking) return;
        let foundIndex = -1;
        const triggerLine = window.innerHeight * 0.3; 

        sections.forEach((sec, i) => {
          const rect = sec.getBoundingClientRect();
          if (rect.top <= triggerLine) foundIndex = i;
        });

        if (foundIndex === -1 && window.scrollY < 100) foundIndex = 0;
        if (foundIndex !== -1 && foundIndex !== activeIndex) {
          activeIndex = foundIndex;
          if (!isHovering) moveBgTo(activeIndex);
        }
      }

      // Event Listeners dla nawigacji
      navLinks.forEach((link, i) => {
        // Click
        link.addEventListener("click", e => {
          e.preventDefault();
          const targetId = link.getAttribute('href');
          const targetSec = document.querySelector(targetId);
          if (targetSec) {
            isClicking = true;
            activeIndex = i;
            moveBgTo(i);
            gsap.to(window, { duration: 1.2, scrollTo: targetSec, ease: "power2.inOut", onComplete: () => {
               // Odblokuj po zakończeniu animacji scrolla
               setTimeout(() => { isClicking = false; updateActiveOnScroll(); }, 100);
            }});
          }
        });
        // Hover
        link.addEventListener("mouseenter", () => {
          if (isClicking) return;
          isHovering = true;
          moveBgTo(i);
        });
      });

      if (navContainer) {
        navContainer.addEventListener("mouseleave", () => {
          if (isClicking) return;
          isHovering = false;
          moveBgTo(activeIndex); 
        });
      }
      window.addEventListener('scroll', updateActiveOnScroll, { passive: true });
    }

    // C. PORTFOLIO BLOCKS (Orange & Width animations)
    function initPortfolioAnimations() {
      if (!window.matchMedia("(min-width: 768px)").matches) return;

      gsap.utils.toArray("[data-animation='true']").forEach(element => {
        const prevElement = element.previousElementSibling; 
        const captionWrapper = element.querySelector('.caption-wrapper');
        const orangeBg = element.querySelector('.block-bg-orange');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: "top bottom",
            end: "top 0%",
            scrub: true, 
            markers: false 
          }
        });

        tl.fromTo(element, { width: "82%" }, { width: "100%", duration: 1 }, 0);

        if (prevElement && prevElement.classList.contains('portfolio-block')) {
          const bgElement = prevElement.querySelector('.bg-black');
          if (bgElement) tl.fromTo(bgElement, { backgroundColor: "rgba(0,0,0,0)" }, { backgroundColor: "rgba(0,0,0,0.75)", duration: 1 }, 0);
        }

        if (captionWrapper) tl.fromTo(captionWrapper, { filter: "blur(20px)", opacity: 0 }, { filter: "blur(0px)", opacity: 1, duration: 0.5 }, 0.5);
        if (orangeBg) tl.fromTo(orangeBg, { scaleX: 0, transformOrigin: "center center" }, { scaleX: 1, duration: 1.2 }, 0.9);
        
        const textElements = element.querySelectorAll('[data-animation="text"]');
        textElements.forEach(textElement => {
          tl.fromTo(textElement, { filter: "blur(20px)", opacity: 0 }, { filter: "blur(0px)", opacity: 1, duration: 0.2 }, 0.8);
        });
      });
    }

    // D. MAIN SLIDERS (Services / Team etc.)
    function initSliders() {
      function animateContent(activeBlock) {
        if (!activeBlock) return;
        const titles = activeBlock.querySelectorAll('.font-size-link, .heading-style-h4');
        const bodies = activeBlock.querySelectorAll('.list-block, .text-caption');
        const dividers = activeBlock.querySelectorAll('.divider');

        gsap.set([titles, bodies], { opacity: 0, y: 10, filter: "blur(10px)" });
        gsap.set(dividers, { scaleX: 0, opacity: 1 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1.2 } });
        tl.to(titles, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.2 })
          .to(bodies, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.15 }, "-=0.8")
          .to(dividers, { scaleX: 1, duration: 2.0, stagger: 0.2 }, "-=2.0");
      }

      document.querySelectorAll('[data-slider-group]').forEach(group => {
        const texts = group.querySelectorAll('.slider-text');
        const inner = group.querySelector('.slider-inner');
        const connects = group.querySelectorAll('[slider-connect]');
        const blocks = group.querySelectorAll('.slider-block, .slider-block-services');

        function goTo(slide, isFirstLoad = false) {
          if (inner && blocks.length > 0) {
            const style = getComputedStyle(inner);
            const gap = parseFloat(style.columnGap || style.gap) || 0;
            const slideWidth = blocks[0].offsetWidth;
            const moveX = -slide * (slideWidth + gap);

            gsap.to(inner, {
              x: moveX,
              duration: 0.1,
              ease: "power1.inOut",
              onComplete: () => { if (!isFirstLoad) animateContent(blocks[slide]); }
            });
          }

          texts.forEach((text, i) => i === slide ? text.classList.remove('font-opacity-25') : text.classList.add('font-opacity-25'));
          connects.forEach((el) => {
            const targetSlide = parseInt(el.getAttribute('slider-connect'));
            if (targetSlide === slide) el.classList.remove('font-color-opacity');
            else el.classList.add('font-color-opacity');
          });

          if (isFirstLoad) animateContent(blocks[slide]);
        }

        ScrollTrigger.create({
          trigger: group,
          start: "top 75%",
          onEnter: () => goTo(0, true),
          once: true
        });

        texts.forEach((text, i) => text.addEventListener('click', () => goTo(i)));
        gsap.set([inner], { x: 0 });
      });
    }

    // E. TESTIMONIAL SLIDER
    function initTestimonials() {
      const wrapper = document.querySelector('.testimonial-wrapper');
      if(!wrapper) return;
      const slides = wrapper.querySelectorAll('.testimonial-slide');
      const prevArrow = document.querySelector('.testimonial-arrow--prev');
      const nextArrow = document.querySelector('.testimonial-arrow--next');
      let current = 0;

      function updateSlider() {
        const slidesToShow = parseInt(getComputedStyle(wrapper).getPropertyValue('--_slider---quantity')) || 1; // Fallback to 1
        const slideCount = slides.length;
        const maxIndex = Math.max(0, slideCount - slidesToShow);
        const gap = 1.375; 

        if (current < 0) current = 0;
        if (current > maxIndex) current = maxIndex;

        const percentagePart = (100 / slidesToShow) * current;
        const gapPart = (gap / slidesToShow) * current;
        wrapper.style.transform = `translateX(calc(-${percentagePart}% - ${gapPart}rem))`;

        if (prevArrow) prevArrow.classList.toggle('is-active', current > 0);
        if (nextArrow) nextArrow.classList.toggle('is-active', current < maxIndex);
      }

      if (prevArrow) prevArrow.addEventListener('click', () => { current--; updateSlider(); });
      if (nextArrow) nextArrow.addEventListener('click', () => { current++; updateSlider(); });
      window.addEventListener('resize', updateSlider);
      updateSlider();
    }

    // F. GENERAL ANIMATIONS (Text & Offers)
    function initGeneralAnimations() {
      // 1. Text Animation
      const textElements = document.querySelectorAll('[text-animation="true"]');
      textElements.forEach((el) => {
        gsap.fromTo(el, 
          { y: 20, filter: 'blur(5px)', opacity: 0 },
          { y: 0, filter: 'blur(0px)', opacity: 1, duration: 1.6, ease: "expoScale(0.5,7,none)", 
            scrollTrigger: { trigger: el, start: "top 80%", toggleActions: "play none none none" }
          }
        );
      });

      // 2. Offer Animation
      const offerElements = document.querySelectorAll('[data-offer]');
      if (offerElements.length > 0) {
        const sortedOffers = Array.from(offerElements).sort((a, b) => a.getAttribute('data-offer') - b.getAttribute('data-offer'));
        gsap.fromTo(sortedOffers, 
          { opacity: 0, y: 40, filter: "blur(5px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.4, ease: "power2.out",
            scrollTrigger: { trigger: ".padding-top-6", start: "top 80%", toggleActions: "play none none none" }
          }
        );
      }
    }
  });
