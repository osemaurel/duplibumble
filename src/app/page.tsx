import Header from "@/components/site/header";
import HeroFan from "@/components/site/hero-fan";
import Gallery from "@/components/site/gallery";
import SignupCta from "@/components/site/signup-cta";
import { SignupProvider, SignupModal } from "@/components/site/signup-modal";
import {
  Mission,
  Verification,
  Communication,
  Testimonial,
  Footer,
} from "@/components/site/static-sections";

export default function Home() {
  return (
    <SignupProvider>
      <Header />
      <HeroFan />
      <Gallery />
      <Mission />
      <Verification />
      <Communication />
      <Testimonial />
      <SignupCta />
      <Footer />
      <SignupModal />
    </SignupProvider>
  );
}
