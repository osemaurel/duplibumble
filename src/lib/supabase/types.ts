/**
 * Types du schéma Palab.
 *
 * Fichier généré depuis la base : à régénérer après toute migration, avec
 *   npx supabase gen types typescript --project-id lwkhkhyqhkubtthmvfkx > src/lib/supabase/types.ts
 * Ne pas l'éditer à la main : la moindre retouche serait perdue à la
 * prochaine génération, et masquerait un écart avec la base réelle.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "member" | "agent" | "admin" | "lady";
export type LadyStatus = "draft" | "pending_review" | "published" | "rejected" | "suspended";
export type PhotoStatus = "pending" | "approved" | "rejected";
export type MaritalStatus = "celibataire" | "divorcee" | "veuve" | "separee";
export type MessageSender = "member" | "lady";
export type Tarif = {
  code: string;
  montant: number;
  libelle: string;
  updated_at: string;
};

export type PalierCredits = {
  code: string;
  libelle: string;
  credits: number;
  /** En centimes : jamais de nombre à virgule flottante pour un prix. */
  prix_cents: number;
  devise: string;
  ordre: number;
  mis_en_avant: boolean;
  actif: boolean;
};

export type CreditReason =
  | "purchase"
  | "message"
  | "photo"
  | "video_minute"
  | "gift"
  | "refund"
  | "bonus"
  | "adjustment";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  country: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type Agent = {
  id: string;
  profile_id: string | null;
  code: string;
  agency_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  languages: string[];
  contract_signed: boolean;
  contract_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Fiche publique. Les données confidentielles vivent dans LadyPrivate. */
export type Lady = {
  id: string;
  code: string;
  agent_id: string | null;
  status: LadyStatus;
  display_name: string;
  age: number | null;
  display_city: string | null;
  display_country: string | null;
  languages: Json;
  marital_status: MaritalStatus | null;
  children: string | null;
  profession: string | null;
  education: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  eyes: string | null;
  hair: string | null;
  religion: string | null;
  smoking: string | null;
  drinking: string | null;
  interests: string[];
  seeking: string | null;
  seeking_age_min: number | null;
  seeking_age_max: number | null;
  willing_to_relocate: string | null;
  headline: string | null;
  bio: string | null;
  looking_for: string | null;
  published_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Jamais exposé au public : agent mandaté et administration uniquement. */
export type LadyPrivate = {
  lady_id: string;
  legal_name: string;
  birth_date: string;
  nationality: string | null;
  residence_country: string | null;
  residence_city: string | null;
  email: string | null;
  phone: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_path: string | null;
  id_selfie_path: string | null;
  mandate_signed: boolean;
  mandate_date: string | null;
  mandate_path: string | null;
  photo_consent: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LadyPhoto = {
  id: string;
  lady_id: string;
  storage_path: string;
  position: number;
  caption: string | null;
  status: PhotoStatus;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  member_id: string;
  lady_id: string;
  last_message_at: string | null;
  member_unread: number;
  agent_unread: number;
  created_at: string;
};

/**
 * `sender` dit au nom de qui part le message ; `authored_by_agent_id` dit qui
 * l'a réellement rédigé. Les deux coexistent : c'est la trace du mandat.
 */
export type Message = {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  sender_profile_id: string | null;
  authored_by_agent_id: string | null;
  body: string;
  attachment_path: string | null;
  read_at: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  member_id: string;
  provider: string;
  provider_ref: string | null;
  credits: number;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreditBalance = {
  member_id: string;
  balance: number;
  updated_at: string;
};

export type CreditTransaction = {
  id: string;
  member_id: string;
  amount: number;
  reason: CreditReason;
  message_id: string | null;
  purchase_id: string | null;
  note: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  lady_id: string | null;
  conversation_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

/**
 * `Relationships` est indispensable même vide : le client s'en sert pour
 * analyser les listes de colonnes d'un `.select("a, b, c")`. Sans cette clé, il
 * ne sait pas résoudre la table et renvoie `never` sur chaque champ.
 */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      profiles: Table<Profile>;
      agents: Table<Agent>;
      ladies: Table<Lady>;
      lady_private: Table<LadyPrivate>;
      lady_photos: Table<LadyPhoto>;
      conversations: Table<Conversation>;
      messages: Table<Message>;
      purchases: Table<Purchase>;
      credit_balances: Table<CreditBalance>;
      credit_transactions: Table<CreditTransaction>;
      reports: Table<Report>;
      tarifs: Table<Tarif>;
      paliers_credits: Table<PalierCredits>;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      current_agent_id: { Args: Record<never, never>; Returns: string };
      agent_owns_lady: { Args: { p_lady_id: string }; Returns: boolean };
      can_access_conversation: { Args: { p_conversation_id: string }; Returns: boolean };
      safe_uuid: { Args: { p_text: string }; Returns: string };
      envoyer_message_membre: {
        Args: { p_conversation_id: string; p_body: string; p_attachment_path?: string | null };
        Returns: string;
      };
      rembourser_messages_sans_reponse: { Args: Record<never, never>; Returns: number };
    };
    Enums: {
      user_role: UserRole;
      lady_status: LadyStatus;
      photo_status: PhotoStatus;
      marital_status: MaritalStatus;
      message_sender: MessageSender;
      credit_reason: CreditReason;
    };
    CompositeTypes: Record<never, never>;
  };
};
