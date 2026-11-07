"use client";

import gsap from "gsap";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { GLImage } from "@/components/gl-image";
import { GLStage } from "@/components/gl-stage";

const BOOKING_URL = "https://cal.com/tzabzeel/discovery-call";
const EMAIL = "reagankisakye0@gmail.com";

const projects = [
  {
    name: "Hotel Varenne",
    location: "New Orleans, Louisiana",
    type: "Hospitality · Brand world",
    src: "/images/hotel-varenne.webp",
    alt: "A warmly lit hotel suite with a quiet, considered mix of natural textures",
    ratio: "portrait",
  },
  {
    name: "The Serein",
    location: "Santa Fe, New Mexico",
    type: "Hotel · Photography",
    src: "/images/the-serein.webp",
    alt: "An elegant living room with sculptural furniture and soft afternoon light",
    ratio: "landscape",
  },
  {
    name: "Casa No. 8",
    location: "Oaxaca, Mexico",
    type: "Restaurant · Art direction",
    src: "/images/casa-no-8.webp",
    alt: "A warmly lit restaurant dining room, ready for the evening",
    ratio: "landscape",
  },
  {
    name: "Field House",
    location: "Hudson Valley, New York",
    type: "Hotel · Identity",
    src: "/images/field-house.webp",
    alt: "A calm contemporary home opening onto a sunlit garden",
    ratio: "portrait",
  },
  {
    name: "Olive & Stone",
    location: "Charleston, South Carolina",
    type: "Restaurant · Photography",
    src: "/images/olive-stone.webp",
    alt: "A candlelit restaurant table set for a thoughtful dinner",
    ratio: "portrait",
  },
  {
    name: "The Slow",
    location: "Joshua Tree, California",
    type: "Stay · Digital",
    src: "/images/the-slow.webp",
    alt: "A quiet desert retreat framed by warm stone and open space",
    ratio: "landscape",
  },
];

const services = [
  {
    title: "Brand identity",
    number: "01",
    src: "/images/the-serein.webp",
    alt: "Softly layered interior details",
  },
  {
    title: "Interior photography",
    number: "02",
    src: "/images/field-house.webp",
    alt: "A sunlit interior with natural materials",
  },
  {
    title: "Art direction",
    number: "03",
    src: "/images/hotel-varenne.webp",
    alt: "Thoughtfully composed architectural details",
  },
  {
    title: "Websites",
    number: "04",
    src: "/images/the-slow.webp",
    alt: "An inviting guest suite with a view",
  },
];

const journal = [
  {
    title: "A slower kind of welcome",
    category: "Notes on hospitality",
    date: "05.18.26",
    src: "/images/field-house.webp",
    alt: "A quiet hotel room with a view of the mountains",
  },
  {
    title: "The shape of a place",
    category: "Field notes",
    date: "04.02.26",
    src: "/images/the-slow.webp",
    alt: "Minimal architecture set against a soft, open landscape",
  },
  {
    title: "Light, left alone",
    category: "On looking",
    date: "02.21.26",
    src: "/images/the-serein.webp",
    alt: "Sunlight moving gently across a considered interior",
  },
];

function useEntranceMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const sections = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (reducedMotion) {
      sections.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          gsap.fromTo(
            element,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              delay: Number(element.dataset.delay ?? 0),
              ease: "power4.out",
              onComplete: () => element.classList.add("is-visible"),
            },
          );
        });
      },
      { threshold: 0.12 },
    );

    sections.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function WordScrub() {
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph) return;
    const words = Array.from(
      paragraph.querySelectorAll<HTMLElement>("[data-word]"),
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      words.forEach((word) => (word.style.opacity = "1"));
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const center = window.innerHeight * 0.52;
      const range = window.innerHeight * 0.48;
      words.forEach((word) => {
        const rect = word.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        const progress = Math.max(0, Math.min(1, 1 - distance / range));
        word.style.opacity = String(0.2 + progress * 0.8);
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const words =
    "We believe the places we remember are the ones that make us feel something. A certain kind of light. A welcome that lingers. Details that feel like they could only belong here. We help thoughtful hotels and restaurants find that feeling — then give it a form people can see, share, and return to.";
  const wordList = words.split(" ");

  return (
    <p className="philosophy-copy" ref={paragraphRef}>
      {wordList.map((word, index) => (
        <span data-word key={`${word}-${index}`}>
          {word}
          {index < wordList.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

function ServiceRow({
  title,
  number,
  src,
  alt,
  delay,
}: (typeof services)[number] & { delay: number }) {
  const [active, setActive] = useState(false);
  const thumbnailRef = useRef<HTMLSpanElement>(null);
  const previous = useRef({ x: 0, time: 0 });
  const target = useRef({ x: 0, y: 0, tilt: 0 });
  const current = useRef({ x: 0, y: 0, tilt: 0 });
  const animationFrame = useRef(0);

  const moveThumbnail = (event: PointerEvent<HTMLLIElement>) => {
    if (
      !window.matchMedia("(hover: hover) and (min-width: 768px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const now = performance.now();
    const elapsed = Math.max(1, now - previous.current.time);
    const velocityX = ((event.clientX - previous.current.x) / elapsed) * 16.7;
    const tilt = Math.max(-0.25, Math.min(0.25, velocityX * 0.02));
    previous.current = { x: event.clientX, time: now };
    target.current = { x: event.clientX + 28, y: event.clientY + 18, tilt };
    const animatePosition = () => {
      const element = thumbnailRef.current;
      if (!element) {
        animationFrame.current = 0;
        return;
      }
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;
      current.current.tilt += (target.current.tilt - current.current.tilt) * 0.12;
      element.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) rotate(${current.current.tilt}rad)`;
      const isSettled =
        Math.abs(target.current.x - current.current.x) < 0.1 &&
        Math.abs(target.current.y - current.current.y) < 0.1 &&
        Math.abs(target.current.tilt - current.current.tilt) < 0.001;
      if (isSettled) {
        animationFrame.current = 0;
        return;
      }
      animationFrame.current = window.requestAnimationFrame(animatePosition);
    };
    if (!animationFrame.current) {
      animationFrame.current = window.requestAnimationFrame(animatePosition);
    }
  };

  const hideThumbnail = () => {
    setActive(false);
    if (animationFrame.current) {
      window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = 0;
    }
  };

  return (
    <li
      className="service-row"
      tabIndex={0}
      data-reveal
      data-delay={delay}
      onPointerEnter={(event) => {
        setActive(true);
        moveThumbnail(event);
      }}
      onPointerMove={moveThumbnail}
      onPointerLeave={hideThumbnail}
      onFocus={() => setActive(true)}
      onBlur={hideThumbnail}
    >
      <span className="service-row__number">{number}</span>
      <h3 className="service-row__title">{title}</h3>
      <span className="service-row__arrow" aria-hidden="true">
        ↗
      </span>
      <span
        ref={thumbnailRef}
        className="service-row__thumbnail"
        aria-hidden="true"
        style={{ display: active ? "block" : "none" }}
        data-active={active}
      >
        <GLImage src={src} alt={alt} sizes="180px" />
      </span>
    </li>
  );
}

export default function Home() {
  useEntranceMotion();

  return (
    <GLStage>
      <div className="site-content">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="TZABZEEL home">
            TZABZEEL<span aria-hidden="true">®</span>
          </a>
          <nav className="primary-nav" aria-label="Main navigation">
            <a href="#work">Work</a>
            <a href="#studio">Studio</a>
            <a href="#journal">Journal</a>
          </nav>
          <a
            className="header-cta"
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
          >
            Book a call <span aria-hidden="true">↗</span>
          </a>
        </header>

        <main id="main-content">
          <section className="hero" id="top" aria-labelledby="hero-title">
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow">A creative studio for places</p>
              <h1 className="hero-title" id="hero-title">
                <span className="hero-title__line">
                  <span>Places, made</span>
                </span>
                <span className="hero-title__line">
                  <span>
                    <em>memorable.</em>
                  </span>
                </span>
              </h1>
              <p className="hero__intro">
                We shape the way the world sees the places worth remembering.
              </p>
            </div>
            <figure className="hero__figure">
              <GLImage
                src="/images/hotel-varenne.webp"
                alt="A serene hotel suite with a layered, natural palette"
                sizes="(max-width: 767px) 82vw, 38vw"
                className="hero__image"
                priority
                unfold
              />
              <figcaption className="image-caption">
                Hotel Varenne, New Orleans, 2026
              </figcaption>
            </figure>
            <a className="hero__scroll" href="#work">
              <span className="hero__scroll-line" aria-hidden="true" />
              Scroll to explore
            </a>
          </section>

          <section
            className="work-section section-pad"
            id="work"
            aria-labelledby="work-title"
          >
            <div className="section-heading" data-reveal>
              <div>
                <p className="eyebrow">01 / A few good places</p>
                <h2 className="section-title" id="work-title">
                  Selected work<span className="section-title__period">.</span>
                </h2>
              </div>
              <p className="section-heading__aside">
                Thoughtful identities and imagery for places with a point of view.
              </p>
            </div>
            <div className="work-grid">
              {projects.map((project, index) => (
                <a
                  className={`work-card work-card--${project.ratio}`}
                  href="#contact"
                  key={project.name}
                  data-reveal
                  data-delay={(index % 2) * 0.08}
                >
                  <GLImage
                    src={project.src}
                    alt={project.alt}
                    sizes="(max-width: 767px) 100vw, (max-width: 1100px) 50vw, 58vw"
                    className="work-card__image"
                    ripple
                  />
                  <span className="work-card__details">
                    <h3 className="work-card__name">{project.name}</h3>
                    <span className="work-card__meta">
                      {project.location} <span aria-hidden="true">·</span>{" "}
                      {project.type}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section
            className="services-section section-pad"
            id="studio"
            aria-labelledby="services-title"
          >
            <div className="services-intro" data-reveal>
              <p className="eyebrow">02 / What we do</p>
              <h2 className="section-title" id="services-title">
                Considered, from{" "}
                <em className="serif-italic">the first impression.</em>
              </h2>
              <p className="services-intro__body">
                A small, senior team making thoughtful work across every
                touchpoint — from the first hello to the last look back.
              </p>
            </div>
            <ul className="service-list" aria-label="Our services">
              {services.map((service, index) => (
                <ServiceRow
                  {...service}
                  key={service.number}
                  delay={index * 0.06}
                />
              ))}
            </ul>
          </section>

          <section
            className="philosophy-section section-pad"
            aria-labelledby="philosophy-title"
          >
            <div className="philosophy-section__label" data-reveal>
              <p className="eyebrow">03 / A point of view</p>
              <h2 className="visually-hidden" id="philosophy-title">
                Our philosophy
              </h2>
            </div>
            <WordScrub />
            <p className="philosophy-signoff" data-reveal>
              The TZABZEEL approach
            </p>
          </section>

          <section
            className="journal-section section-pad"
            id="journal"
            aria-labelledby="journal-title"
          >
            <div className="section-heading" data-reveal>
              <div>
                <p className="eyebrow">04 / From the journal</p>
                <h2 className="section-title" id="journal-title">
                  Notes from here<span className="section-title__period">.</span>
                </h2>
              </div>
              <a
                className="text-link"
                href={`mailto:${EMAIL}?subject=Journal%20notes`}
              >
                Ask us about the journal <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="journal-grid">
              {journal.map((article, index) => (
                <article
                  className="journal-card"
                  key={article.title}
                  data-reveal
                  data-delay={index * 0.07}
                >
                  <GLImage
                    src={article.src}
                    alt={article.alt}
                    sizes="(max-width: 767px) 100vw, 33vw"
                    className="journal-card__image"
                  />
                  <span className="journal-card__topline">
                    <span>{article.category}</span>
                    <time
                      className="eyebrow"
                      dateTime={`2026-${article.date.slice(0, 2)}-${article.date.slice(3, 5)}`}
                    >
                      {article.date}
                    </time>
                  </span>
                  <h3 className="journal-card__title">{article.title}</h3>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className="site-footer section-pad" id="contact">
          <div className="footer-heading" data-reveal>
            <p className="eyebrow">05 / Begin somewhere</p>
            <h2>
              Let&apos;s make a place
              <br />
              <em className="serif-italic">memorable.</em>
            </h2>
            <a className="footer-email" href={`mailto:${EMAIL}`}>
              {EMAIL} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="footer-bottom">
            <a className="wordmark" href="#top" aria-label="TZABZEEL home">
              TZABZEEL<span aria-hidden="true">®</span>
            </a>
            <div className="footer-locations">
              <p className="eyebrow">Where we are</p>
              <p>Kampala · Mengo · Mukono, Uganda</p>
            </div>
            <a
              className="footer-booking"
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
            >
              Book a discovery call <span aria-hidden="true">↗</span>
            </a>
            <p className="footer-copyright">© TZABZEEL 2026</p>
          </div>
        </footer>
      </div>
    </GLStage>
  );
}
