"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Lien de navigation qui se marque lui-même comme actif.
 *
 * Sans cela, rien n'indique où l'on se trouve — le défaut le plus visible d'un
 * back-office. `aria-current` sert à la fois au style et aux lecteurs d'écran.
 */
export default function NavLien({
  href,
  icone,
  compte = 0,
  children,
}: {
  href: string;
  icone?: ReactNode;
  compte?: number;
  children: ReactNode;
}) {
  const chemin = usePathname();

  // La racine d'un espace ne s'active que sur elle-même, sinon elle resterait
  // allumée sur toutes ses sous-pages.
  const actif =
    href === "/admin" || href === "/agent" ? chemin === href : chemin.startsWith(href);

  return (
    <Link href={href} aria-current={actif ? "page" : undefined}>
      {icone}
      {children}
      {compte > 0 && <span className="compte">{compte}</span>}
    </Link>
  );
}
