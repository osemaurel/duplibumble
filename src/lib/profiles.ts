/**
 * Jeu de profils de démonstration.
 *
 * Étape suivante : ces données viendront de Supabase (table `ladies`),
 * chargées côté serveur. La forme du type est déjà pensée pour ça —
 * `id` deviendra un uuid et `photo` une URL de Supabase Storage.
 */
export type Profile = {
  id: string;
  name: string;
  age: number;
  location: string;
  photo: string;
  online: boolean;
  verified: boolean;
};

export const profiles: Profile[] = [
  { id: "p1", name: "Amina",    age: 28, location: "Abidjan, Côte d’Ivoire",     photo: "/profiles/p1.avif", online: true,  verified: true },
  { id: "p2", name: "Daniela",  age: 28, location: "Lisbonne, Portugal",         photo: "/profiles/h1.avif", online: true,  verified: true },
  { id: "p3", name: "Fatou",    age: 33, location: "Dakar, Sénégal",             photo: "/profiles/p2.avif", online: true,  verified: true },
  { id: "p4", name: "Mei",      age: 25, location: "Manille, Philippines",       photo: "/profiles/p3.avif", online: false, verified: true },
  { id: "p5", name: "Katarina", age: 38, location: "Varsovie, Pologne",          photo: "/profiles/p4.avif", online: true,  verified: true },
  { id: "p6", name: "Sofia",    age: 30, location: "Bogotá, Colombie",           photo: "/profiles/p5.avif", online: true,  verified: true },
  { id: "p7", name: "Léa",      age: 24, location: "Montréal, Canada",           photo: "/profiles/sk.avif", online: false, verified: true },
  { id: "p8", name: "Hélène",   age: 42, location: "Lyon, France",               photo: "/profiles/p6.avif", online: true,  verified: true },
  { id: "p9", name: "Tiana",    age: 30, location: "Antananarivo, Madagascar",   photo: "/profiles/h3.avif", online: true,  verified: true },
  { id: "p10", name: "Alice",   age: 23, location: "Bruxelles, Belgique",        photo: "/profiles/al.avif", online: false, verified: true },
  { id: "p11", name: "Nadia",   age: 27, location: "Casablanca, Maroc",          photo: "/profiles/ru.avif", online: true,  verified: true },
  { id: "p12", name: "Clara",   age: 35, location: "São Paulo, Brésil",          photo: "/profiles/dg.avif", online: false, verified: true },
];
