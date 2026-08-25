-- Remboursement des messages restés sans réponse.
--
-- Payer pour écrire à quelqu'un qu'on ne connaît pas n'est acceptable que si
-- le silence est rendu. Passé le délai, le crédit revient au membre.
--
-- Le remboursement porte sur chaque message facturé qu'aucune réponse ne suit.
-- Une réponse ultérieure couvre donc tous les messages qui la précèdent : le
-- membre n'est remboursé que de ce qui n'a rien produit.

create or replace function public.rembourser_messages_sans_reponse()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jours integer;
  v_nb    integer;
begin
  select montant into v_jours from public.tarifs where code = 'jours_remboursement';
  v_jours := coalesce(v_jours, 7);

  with a_rembourser as (
    select t.member_id, t.amount, t.message_id
      from public.credit_transactions t
      join public.messages m on m.id = t.message_id
     where t.amount < 0
       and t.reason in ('message', 'photo')
       and m.created_at < now() - make_interval(days => v_jours)
       and not exists (
         select 1 from public.messages r
          where r.conversation_id = m.conversation_id
            and r.sender = 'lady'
            and r.created_at > m.created_at
       )
       -- Un message déjà remboursé ne l'est pas deux fois.
       and not exists (
         select 1 from public.credit_transactions x
          where x.message_id = t.message_id and x.reason = 'refund'
       )
  )
  insert into public.credit_transactions (member_id, amount, reason, message_id, note)
  select member_id, -amount, 'refund', message_id,
         'Aucune réponse sous ' || v_jours || ' jours'
    from a_rembourser;

  get diagnostics v_nb = row_count;
  return v_nb;
end $$;

revoke all on function public.rembourser_messages_sans_reponse() from public;

create extension if not exists pg_cron with schema extensions;

-- Une passe quotidienne suffit : le délai se compte en jours.
select cron.unschedule('remboursements-sans-reponse')
 where exists (select 1 from cron.job where jobname = 'remboursements-sans-reponse');

select cron.schedule(
  'remboursements-sans-reponse',
  '17 3 * * *',
  $$select public.rembourser_messages_sans_reponse();$$
);
