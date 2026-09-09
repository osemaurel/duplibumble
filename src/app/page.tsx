import Header from "@/components/site/header";
import HeroFan from "@/components/site/hero-fan";
import Gallery from "@/components/site/gallery";
import SignupCta from "@/components/site/signup-cta";
import {
  Mission,
  Verification,
  Communication,
  Testimonial,
  Footer,
} from "@/components/site/static-sections";
import { profilsVitrine } from "@/lib/vitrine";

/**
 * Rendue à l'avance et servie depuis le cache, refaite au plus une fois par
 * minute. Elle était jusqu'ici reconstruite à chaque visite, ce qui coûtait un
 * rendu serveur complet — et un démarrage à froid pour le premier visiteur,
 * mesuré à plus de deux secondes et demie — pour une page identique pour tout
 * le monde.
 *
 * La minute n'est pas un délai d'attente : publier une fiche rafraîchit cette
 * page immédiatement, `publierFiche` s'en charge. Elle ne sert que de filet
 * pour ce qui change sans passer par là.
 */
export const revalidate = 60;

export default async function Home() {
  // Un seul appel pour toute la page : les photos sont signées une fois et
  // partagées entre l'éventail et les sections éditoriales.
  const profils = await profilsVitrine();

  return (
    <>
      <Header />
      <HeroFan profils={profils} />
      <Gallery />
      <Mission profils={profils} />
      <Verification profils={profils} />
      <Communication profils={profils} />
      <Testimonial />
      <SignupCta />
      <Footer />
    </>
  );
}
