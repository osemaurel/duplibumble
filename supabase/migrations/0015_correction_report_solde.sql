-- Correction du report des mouvements sur le solde.
--
-- L'ancienne version tenait en une instruction :
--
--   insert into credit_balances (member_id, balance) values (new.member_id, new.amount)
--   on conflict (member_id) do update set balance = credit_balances.balance + excluded.balance
--
-- Elle paraissait juste et ne l'était pas. PostgreSQL contrôle les contraintes
-- CHECK sur la ligne proposée avant d'arbitrer le ON CONFLICT : pour un débit,
-- la ligne proposée porte un montant négatif, `balance >= 0` la rejette, et la
-- branche DO UPDATE n'est jamais atteinte. Tout mouvement négatif échouait donc
-- depuis l'origine — ce qui explique quinze messages envoyés pour un seul
-- mouvement enregistré.
--
-- En deux temps, la ligne proposée à l'insertion vaut zéro : elle passe la
-- contrainte. Le débit s'applique ensuite par mise à jour, où la contrainte
-- porte enfin sur le solde résultant — et refuse à bon droit un découvert.

create or replace function public.apply_credit_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_balances (member_id, balance, updated_at)
  values (new.member_id, 0, now())
  on conflict (member_id) do nothing;

  update public.credit_balances
     set balance    = balance + new.amount,
         updated_at = now()
   where member_id = new.member_id;

  return new;
end $$;
