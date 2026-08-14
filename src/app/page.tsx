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

export const dynamic = "force-dynamic";

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
