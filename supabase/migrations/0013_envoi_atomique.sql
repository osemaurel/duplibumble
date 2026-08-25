-- Envoi d'un message par un membre : message et débit dans la même transaction.
--
-- Auparavant l'application faisait deux appels — insérer le message, puis
-- écrire le débit. Quand le second échouait, le code se contentait de
-- l'inscrire aux journaux : le message partait sans être facturé. C'est ce qui
-- s'est produit en production, quinze messages pour un seul mouvement de
-- crédit. Ici les deux écritures réussissent ensemble ou échouent ensemble.
--
-- Le coût n'est pas un paramètre : il est lu dans `tarifs`. Un paramètre serait
-- fourni par l'appelant, et rien n'empêcherait d'annoncer zéro.

create or replace function public.envoyer_message_membre(
  p_conversation_id uuid,
  p_body            text,
  p_attachment_path text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membre  uuid := auth.uid();
  v_motif   public.credit_reason;
  v_cout    integer;
  v_solde   integer;
  v_message uuid;
  v_corps   text := coalesce(btrim(p_body), '');
  v_piece   text := nullif(btrim(coalesce(p_attachment_path, '')), '');
begin
  if v_membre is null then
    raise exception 'AUTHENTIFICATION_REQUISE' using errcode = '42501';
  end if;

  -- La fonction contourne le RLS : la propriété se vérifie donc ici, sans quoi
  -- n'importe qui écrirait dans la conversation d'un autre.
  if not exists (
    select 1 from public.conversations c
     where c.id = p_conversation_id and c.member_id = v_membre
  ) then
    raise exception 'CONVERSATION_INTROUVABLE' using errcode = '42501';
  end if;

  if v_corps = '' and v_piece is null then
    raise exception 'MESSAGE_VIDE' using errcode = '22023';
  end if;

  v_motif := case when v_piece is not null then 'photo' else 'message' end;

  select montant into v_cout from public.tarifs where code = v_motif::text;
  if v_cout is null then
    raise exception 'TARIF_INTROUVABLE' using errcode = 'P0001';
  end if;

  -- Verrou sur la ligne de solde. Deux envois lancés en même temps se
  -- présenteraient sinon tous deux devant le même crédit et passeraient tous
  -- deux : le solde deviendrait négatif.
  select balance into v_solde
    from public.credit_balances
   where member_id = v_membre
     for update;

  if coalesce(v_solde, 0) < v_cout then
    raise exception 'CREDITS_INSUFFISANTS' using errcode = 'P0001';
  end if;

  insert into public.messages
    (conversation_id, sender, sender_profile_id, body, attachment_path)
  values
    (p_conversation_id, 'member', v_membre, v_corps, v_piece)
  returning id into v_message;

  insert into public.credit_transactions (member_id, amount, reason, message_id)
  values (v_membre, -v_cout, v_motif, v_message);

  return v_message;
end $$;

-- EXECUTE est accordé à PUBLIC par défaut : le retirer à `anon` seul ne
-- suffirait pas.
revoke all on function public.envoyer_message_membre(uuid, text, text) from public;
grant execute on function public.envoyer_message_membre(uuid, text, text) to authenticated;
