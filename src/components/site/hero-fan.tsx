"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ProfilVitrine } from "@/lib/vitrine";

/** Nombre de cartes visibles et amplitude de l'éventail selon la largeur. */
function fanConfig(width: number) {
  if (width < 640) return { n: 3, spread: 0.62, arc: 0.13 };
  if (width < 900) return { n: 3, spread: 0.8, arc: 0.16 };
  if (width < 1200) return { n: 5, spread: 1.45, arc: 0.3 };
  return { n: 7, spread: 2.05, arc: 0.4 };
}

const ROTATE_MS = 4200;

/**
 * Les profils viennent du serveur : ce sont les fiches réellement publiées,
 * avec leurs photos signées. Ce composant ne connaît plus aucune liste en dur.
 */
export default function HeroFan({ profils }: { profils: ProfilVitrine[] }) {
  const fanRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const total = profils.length;

  /** Place chaque carte selon sa position dans l'éventail. */
  const layout = useCallback(() => {
    const fan = fanRef.current;
    if (!fan) return;
    const cards = Array.from(fan.querySelectorAll<HTMLElement>(".fcard"));
    if (!cards.length) return;

    const { n, spread, arc } = fanConfig(window.innerWidth);
    const cardWidth = cards[0].offsetWidth || 200;
    const half = (n - 1) / 2;
    const shift = Math.floor((n - 1) / 2);

    cards.forEach((card, i) => {
      const rel = (((i - center + shift) % total) + total) % total;
      const slot = rel < n ? rel : -1;

      if (slot < 0) {
        card.style.opacity = "0";
        card.style.zIndex = "0";
        card.style.transform = "translate(-50%,-50%) scale(.6)";
        card.classList.remove("is-live");
        return;
      }

      const d = half ? (slot - half) / half : 0; // -1 … 1
      let x = d * cardWidth * spread;
      let y = d * d * cardWidth * arc;
      let rot = d * 21;
      let scale = 1 - 0.2244 * d * d;
      let lift = 0;

      if (hovered !== null) {
        if (hovered === slot) {
          y -= cardWidth * 0.09;
          scale *= 1.08;
          lift = 8;
        } else {
          const dist = Math.abs(slot - hovered);
          const push = (cardWidth * 0.13 * (1 - Math.abs(d) * 0.5)) / dist;
          x += slot < hovered ? -push : push;
          rot += slot < hovered ? -3 / dist : 3 / dist;
        }
      }

      card.style.opacity = "1";
      card.style.zIndex = String(10 - Math.round(Math.abs(d) * 6) + lift);
      card.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rot}deg) scale(${scale})`;
      card.classList.add("is-live");
    });
  }, [center, hovered, total]);

  useEffect(() => {
    layout();
    window.addEventListener("resize", layout, { passive: true });
    return () => window.removeEventListener("resize", layout);
  }, [layout]);

  // Défilement automatique, en pause au survol.
  useEffect(() => {
    if (hovered !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setCenter((c) => (c + 1) % total), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [hovered, total]);

  const go = (dir: number) => setCenter((c) => (c + dir + total) % total);

  /** Position visible d'une carte, ou -1 si elle est hors éventail. */
  const slotOf = (index: number) => {
    const { n } = fanConfig(window.innerWidth);
    const shift = Math.floor((n - 1) / 2);
    const rel = (((index - center + shift) % total) + total) % total;
    return rel < n ? rel : -1;
  };

  return (
    <section className="hero">
      <div className="hero-stage">
        <div className="fan" ref={fanRef} onMouseLeave={() => setHovered(null)}>
          {profils.map((p, i) => (
            <figure
              key={p.id}
              className="fcard"
              onMouseEnter={() => {
                const s = slotOf(i);
                if (s >= 0) setHovered(s);
              }}
            >
              <span className="ph" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={`${p.nom}${p.age ? `, ${p.age}` : ""}`} />
              <figcaption>
                {p.nom}
                {p.age ? `, ${p.age}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="fan-nav">
          <button className="fan-arrow" onClick={() => go(-1)} aria-label="Profil précédent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="fan-dots">
            {profils.map((p, i) => (
              <i key={p.id} className={i === center ? "on" : undefined} />
            ))}
          </div>

          <button className="fan-arrow" onClick={() => go(1)} aria-label="Profil suivant">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
