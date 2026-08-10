"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navigation du bas, sur mobile.
 *
 * Trois destinations, au pouce, toujours à la même place. Empiler profils,
 * messages, crédits et déconnexion dans un en-tête de téléphone donne une
 * rangée de petits liens serrés que personne ne vise juste.
 */
const ONGLETS = [
  {
    href: "/profils",
    label: "Profils",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.6-3.6" />
      </svg>
    ),
  },
  {
    href: "/membre",
    label: "Messages",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.7L3 21l1.9-5a8.4 8.4 0 0 1-.8-3.6 8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 8.5 8.4Z" />
      </svg>
    ),
  },
  {
    href: "/membre/compte",
    label: "Compte",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

export default function BarreOnglets({ nonLus }: { nonLus: number }) {
  const chemin = usePathname();

  return (
    <nav className="mb-onglets">
      {ONGLETS.map((onglet) => {
        const actif =
          onglet.href === "/membre"
            ? chemin === "/membre" || chemin.startsWith("/membre/conversations")
            : chemin.startsWith(onglet.href);

        return (
          <Link key={onglet.href} href={onglet.href} aria-current={actif ? "page" : undefined}>
            <span className="ico">
              {onglet.icone}
              {onglet.href === "/membre" && nonLus > 0 && <span className="point" />}
            </span>
            {onglet.label}
          </Link>
        );
      })}
    </nav>
  );
}
