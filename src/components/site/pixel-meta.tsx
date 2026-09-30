"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import {
  PIXEL,
  type Consentement,
  enregistrerConsentement,
  evenementMeta,
} from "@/lib/pixel";

import { useConsentement } from "./consentement";

/**
 * Pixel Meta, posé à la racine du site.
 *
 * Trois choses que l'extrait fourni par Meta ne fait pas, et qui manquent ici
 * plus qu'ailleurs.
 *
 * D'abord, il se charge sans rien demander. C'est un traceur publicitaire sur
 * un site français : il lui faut un accord préalable. Le script n'est donc
 * monté qu'après un « Accepter », et le bandeau ne piège personne — refuser
 * coûte exactement le même clic qu'accepter.
 *
 * Ensuite, il ne compte qu'une page par visite. Il est écrit pour un site où
 * chaque lien recharge le document ; ici la navigation se fait sans
 * rechargement, et un visiteur qui parcourt quinze fiches n'aurait été compté
 * qu'une fois. D'où le décompte à chaque changement d'adresse — et, pour que
 * la première vue ne soit pas comptée deux fois, l'initialisation n'appelle
 * plus `PageView` : c'est l'effet qui s'en charge, y compris au premier
 * affichage.
 *
 * Enfin, l'adresse dit déjà beaucoup : une fiche consultée, une recherche
 * filtrée, une inscription qui vient d'aboutir. Autant de conversions qu'on
 * n'a pas besoin d'aller câbler page par page.
 */
export default function PixelMeta() {
  // `undefined` tant que le navigateur n'a pas rendu la main : le serveur
  // ignore ce choix, et afficher le bandeau dès le premier rendu le ferait
  // clignoter chez tous ceux qui ont déjà répondu.
  const choix = useConsentement();
  const actif = choix === "oui";

  return (
    <>
      {actif && (
        <Script id="pixel-meta" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL}');`}
        </Script>
      )}

      {/* `useSearchParams` impose une frontière de suspension : sans elle,
          toutes les pages seraient rendues à la demande à chaque visite, et la
          page d'accueil cesserait d'être servie depuis le cache. */}
      <Suspense fallback={null}>
        <Parcours choix={choix} />
      </Suspense>

      {choix === null && <Bandeau />}
    </>
  );
}

/** Ce que l'adresse suffit à raconter : vues, fiches, recherches, inscription. */
function Parcours({ choix }: { choix: Consentement | null | undefined }) {
  const chemin = usePathname();
  const parametres = useSearchParams();
  const actif = choix === "oui";

  // `useSearchParams` rend un nouvel objet à chaque rendu : la dépendance
  // porte sur le texte de la requête, sinon l'effet se rejouerait sans cesse.
  //
  // La marque d'inscription en est retirée, et ce n'est pas une coquetterie :
  // Next surveille `history.replaceState`, si bien que l'effacer plus bas
  // change la requête, relance cet effet, et compte la page deux fois.
  const reste = new URLSearchParams(parametres.toString());
  const inscrit = reste.get("inscrit") === "1";
  reste.delete("inscrit");
  const requete = reste.toString();

  useEffect(() => {
    if (!actif) return;

    evenementMeta("PageView");

    const fiche = chemin.startsWith("/profils/") ? chemin.slice("/profils/".length) : "";

    if (fiche) {
      evenementMeta("ViewContent", {
        content_type: "product",
        content_ids: [fiche],
        content_category: "profil",
      });
    } else if (chemin === "/profils" && requete) {
      evenementMeta("Search", { content_category: "profils" });
    }
  }, [actif, chemin, requete]);

  // L'inscription se termine par une redirection décidée sur le serveur : rien
  // ne tourne dans le navigateur à ce moment-là. Elle laisse donc une marque
  // dans l'adresse, lue ici puis effacée — sans quoi un rechargement, ou le
  // lien copié à quelqu'un, recompterait l'inscription.
  //
  // La marque attend qu'une réponse ait été donnée au bandeau. C'est le cas
  // qui compte le plus : quelqu'un qui arrive d'une publicité, s'inscrit sans
  // avoir répondu, puis accepte. Effacer la marque avant sa réponse perdrait
  // précisément la conversion qu'on cherche à mesurer.
  useEffect(() => {
    if (!inscrit || choix === undefined || choix === null) return;

    if (choix === "oui") {
      evenementMeta("CompleteRegistration", { content_name: "compte membre", status: true });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("inscrit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [choix, inscrit]);

  return null;
}

function Bandeau() {
  return (
    <aside className="pub-bandeau" aria-label="Choix publicitaire">
      <p>
        Nous aimerions mesurer l&apos;efficacité de nos publicités à l&apos;aide d&apos;un outil
        de Meta (Facebook, Instagram). Cela dépose un cookie et n&apos;a lieu qu&apos;avec votre
        accord. Le site fonctionne exactement pareil si vous refusez.{" "}
        <Link href="/confidentialite">En savoir plus</Link>
      </p>

      <div className="pub-bandeau-boutons">
        <button type="button" onClick={() => enregistrerConsentement("non")}>
          Refuser
        </button>
        <button
          type="button"
          className="pub-accord"
          onClick={() => enregistrerConsentement("oui")}
        >
          Accepter
        </button>
      </div>
    </aside>
  );
}
