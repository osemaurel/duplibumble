"use client";

import { useState } from "react";
import { profiles } from "@/lib/profiles";
import { useSignup } from "./signup-modal";

const FILTERS = [
  { id: "f-age", label: "Âge", options: ["18 – 25", "26 – 35", "36 – 45", "46 et +"] },
  { id: "f-pays", label: "Pays", options: ["Afrique de l'Ouest", "Afrique centrale", "Europe", "Amérique latine", "Asie"] },
  { id: "f-statut", label: "Situation", options: ["Célibataire", "Divorcée", "Veuve"] },
  { id: "f-langue", label: "Langue", options: ["Français", "Anglais", "Espagnol", "Portugais"] },
  { id: "f-objectif", label: "Recherche", options: ["Relation sérieuse", "Mariage", "Amitié", "Correspondance"] },
  { id: "f-online", label: "Toutes", options: ["En ligne maintenant"] },
];

export default function Gallery() {
  const { open } = useSignup();
  const [pending, setPending] = useState(false);

  // Recherche factice tant que Supabase n'est pas branché : la requête
  // partira ensuite côté serveur avec les valeurs des filtres.
  const search = () => {
    setPending(true);
    window.setTimeout(() => setPending(false), 350);
  };

  return (
    <section className="gal" id="profils">
      <div className="wrap">
        <div className="gal-head">
          <div>
            <h2>Elles sont en ligne maintenant</h2>
            <p>
              Parcourez les profils vérifiés de femmes du monde entier, puis lancez la
              conversation. Chaque profil est validé par notre équipe avant publication.
            </p>
          </div>
          <span className="live-count">
            <span className="live-dot" /> 1 248 membres connectées
          </span>
        </div>

        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <div className="filters-row">
            {FILTERS.map((f) => (
              <select key={f.id} id={f.id} aria-label={f.label} defaultValue="">
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ))}
          </div>
          <button className="f-go" type="submit">
            Rechercher
          </button>
        </form>

        <div className="grid" style={{ opacity: pending ? 0.4 : 1, transition: "opacity .25s" }}>
          {profiles.map((p) => (
            <article className="pcard" key={p.id}>
              <div className="pcard-photo">
                <div className="ph" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.photo} alt={`Profil de ${p.name}, ${p.age} ans`} />
                {p.online && (
                  <span className="badge-live">
                    <span className="live-dot" /> En ligne
                  </span>
                )}
                {p.verified && <span className="badge-ok">✓ Vérifié</span>}
              </div>
              <div className="pcard-body">
                <h3>
                  {p.name}, {p.age}
                </h3>
                <span className="loc">{p.location}</span>
                <div className="pcard-acts">
                  <button
                    className="p-msg"
                    onClick={() => open({ name: p.name, age: p.age, photo: p.photo })}
                  >
                    <span className="lbl-l">Envoyer un message</span>
                    <span className="lbl-s">Message</span>
                  </button>
                  <button
                    className="p-vid"
                    aria-label={`Chat vidéo avec ${p.name}`}
                    onClick={() => open({ name: p.name, age: p.age, photo: p.photo })}
                  >
                    🎥
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="gal-more">
          <button className="btn-dark" onClick={() => open()}>
            Voir tous les profils
          </button>
        </div>
      </div>
    </section>
  );
}
