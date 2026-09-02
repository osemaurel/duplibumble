-- Rattachement des paliers à Paddle, et enregistrement idempotent d'un achat.

alter table public.paliers_credits
  add column if not exists paddle_price_id text;

comment on column public.paliers_credits.paddle_price_id is
  'Identifiant du prix chez Paddle. C''est lui qui détermine le nombre de
   crédits accordés : le montant annoncé par le navigateur n''est jamais cru.';

create unique index if not exists paliers_credits_paddle_price_id_idx
  on public.paliers_credits (paddle_price_id)
  where paddle_price_id is not null;

-- Deux notifications portant la même transaction ne peuvent pas créer deux
-- achats. C'est cet index qui rend le crédit idempotent, pas le code appelant.
create unique index if not exists purchases_fournisseur_reference_idx
  on public.purchases (provider, provider_ref)
  where provider_ref is not null;

/*
 * Enregistre un achat et crédite le compte, en une seule opération.
 *
 * Le nombre de crédits n'est pas un paramètre : il est lu dans le palier
 * rattaché au prix Paddle. La notification dit ce qui a été payé, la base dit
 * ce que cela vaut — sans quoi une charge utile fabriquée pourrait réclamer
 * mille crédits pour un palier à vingt.
 *
 * Renvoie le nombre de crédits accordés, ou zéro si la transaction avait déjà
 * été traitée : Paddle réémet ses notifications, et le second passage ne doit
 * rien ajouter.
 */
create or replace function public.enregistrer_achat_credits(
  p_membre        uuid,
  p_fournisseur   text,
  p_reference     text,
  p_price_id      text,
  p_montant_cents integer,
  p_devise        text default 'EUR'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
  v_achat   uuid;
begin
  if not exists (
    select 1 from public.profiles
     where id = p_membre and role = 'member'
  ) then
    raise exception 'MEMBRE_INTROUVABLE' using errcode = 'P0001';
  end if;

  select credits into v_credits
    from public.paliers_credits
   where paddle_price_id = p_price_id;

  if v_credits is null then
    raise exception 'PALIER_INTROUVABLE' using errcode = 'P0001';
  end if;

  insert into public.purchases
    (member_id, provider, provider_ref, credits, amount_cents, currency, status)
  values
    (p_membre, p_fournisseur, p_reference, v_credits, p_montant_cents,
     coalesce(nullif(p_devise, ''), 'EUR'), 'completed')
  on conflict (provider, provider_ref) do nothing
  returning id into v_achat;

  -- Rien inséré : la notification est un doublon. On ne crédite pas deux fois.
  if v_achat is null then
    return 0;
  end if;

  insert into public.credit_transactions (member_id, amount, reason, purchase_id)
  values (p_membre, v_credits, 'purchase', v_achat);

  return v_credits;
end $$;

-- Seul le serveur, muni de la clé de service, enregistre un achat.
revoke all on function public.enregistrer_achat_credits(uuid, text, text, text, integer, text) from public;
grant execute on function public.enregistrer_achat_credits(uuid, text, text, text, integer, text) to service_role;
