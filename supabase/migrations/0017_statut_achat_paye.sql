-- Correction : `purchases.status` n'admet que pending, paid, failed, refunded.
-- La fonction écrivait « completed », emprunté au nom de l'événement Paddle
-- (`transaction.completed`), et la contrainte la rejetait — donc aucun achat
-- n'aurait été enregistré. Le vocabulaire de la table prime sur celui du
-- fournisseur : un achat réglé est « paid ».

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
     coalesce(nullif(p_devise, ''), 'EUR'), 'paid')
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
