-- Assistant de rédaction, propre à chaque agent.
--
-- Certains agents veulent s'appuyer sur un modèle de langage pour ne pas
-- laisser un premier message sans réponse quand ils ne sont pas devant leur
-- écran. C'est leur choix, leur abonnement et leur clé : Palab ne fournit ni
-- l'un ni l'autre, et n'en supporte pas le coût.
--
-- Deux exigences gouvernent cette table.
--
-- La clé n'est jamais lisible. Elle est chiffrée par l'application avant
-- d'arriver ici (AES-256-GCM, clé dans l'environnement), et aucune politique
-- n'en ouvre la lecture — pas même à l'agent qui l'a posée. Une copie de la
-- base ne livre donc rien d'utilisable, et l'agent ne retrouve de sa clé que
-- les quatre derniers caractères, assez pour la reconnaître.
--
-- Ce qu'une machine écrit se sait. `messages.redige_par_ia` le consigne, sans
-- toucher à `authored_by_agent_id` : le mandat reste celui de l'agent, qui
-- répond de ce qui part en son nom. Sans cette colonne, l'administration
-- perdrait la distinction entre un message pesé par un mandataire et un
-- message produit par un modèle — et c'est précisément la distinction qu'un
-- litige viendrait chercher.

create table public.agent_ia (
  agent_id     uuid primary key references public.agents(id) on delete cascade,
  -- Chiffrée par l'application. Jamais de clé en clair dans cette colonne.
  cle_chiffree text,
  -- Quatre derniers caractères de la clé, pour que l'agent reconnaisse la
  -- sienne sans qu'on ait à la lui remontrer.
  empreinte    text,
  modele       text not null default 'gpt-4o-mini',
  -- Ton et règles maison, ajoutés aux consignes de la plateforme.
  consignes    text,
  actif        boolean not null default false,
  -- Dernier essai concluant auprès d'OpenAI.
  verifiee_le  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger agent_ia_updated_at
  before update on public.agent_ia
  for each row execute function public.set_updated_at();

alter table public.agent_ia enable row level security;

-- Aucune politique de lecture pour les agents : la colonne chiffrée ne sort
-- pas de la base par le client. L'application lit cette table avec la clé de
-- service, en se limitant explicitement à l'agent authentifié, et ne renvoie
-- à l'écran que ce qui n'est pas secret.
create policy agent_ia_admin on public.agent_ia
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.messages
  add column redige_par_ia boolean not null default false;

comment on column public.messages.redige_par_ia is
  'Vrai si le texte a été proposé par un modèle de langage. L''agent reste
   l''auteur responsable — authored_by_agent_id ne change pas — mais la trace
   de la machine est conservée.';
