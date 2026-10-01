-- Fermeture d'un trou béant : des fonctions réservées au serveur étaient
-- appelables par n'importe quel visiteur.
--
-- La 0008 retirait le droit d'exécution hérité de PUBLIC, et cela suffisait
-- alors. Mais Supabase accorde aussi `execute` *explicitement* à `anon` et
-- `authenticated` sur chaque fonction créée dans `public`. Révoquer sur PUBLIC
-- ne touche pas à ces droits-là : toutes les fonctions écrites depuis la 0008
-- sont donc restées ouvertes, malgré le `revoke ... from public` qui figurait
-- consciencieusement au bas de chaque migration et ne servait à rien.
--
-- Ce que cela donnait, vérifié depuis l'extérieur avec la seule clé publiable
-- — celle qui part dans le HTML de chaque page, lisible par tout le monde :
--
--   POST /rest/v1/rpc/enregistrer_achat_credits
--        { "p_membre": "<n'importe qui>", "p_price_id": "<un palier réel>" }
--
-- Cette fonction est `security definer`. Elle inscrit un achat et crédite le
-- compte. Aucune session n'était nécessaire, et l'identifiant de prix Paddle
-- part déjà dans le navigateur pour ouvrir le paiement : il n'y avait rien à
-- deviner. La référence d'achat étant choisie par l'appelant, l'opération se
-- répétait autant de fois que voulu. Soit des crédits illimités, gratuits,
-- pour qui savait lire le code d'une page.
--
-- Au même endroit : `rembourser_messages_sans_reponse` déclenchait une
-- campagne de remboursement, et `conversations_pour_ia` rendait la liste des
-- conversations en attente avec leurs agents, à un visiteur anonyme.
--
-- La règle appliquée ici : une fonction n'est ouverte à `anon` ou
-- `authenticated` que si le navigateur a une raison de l'appeler.

-- ---------------------------------------------------- réservé au serveur
-- Le paiement. Seule la notification signée reçue par le serveur crédite.
revoke execute on function
  public.enregistrer_achat_credits(uuid, text, text, text, integer, text)
  from public, anon, authenticated;

-- Les tâches planifiées.
revoke execute on function public.rembourser_messages_sans_reponse()
  from public, anon, authenticated;

-- L'assistant : rien là-dedans ne se pilote depuis un navigateur.
revoke execute on function public.conversations_pour_ia(integer)
  from public, anon, authenticated;
revoke execute on function public.marquer_tentative_ia(uuid)
  from public, anon, authenticated;
revoke execute on function public.reclamer_conversation_ia(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.liberer_conversation_ia(uuid)
  from public, anon, authenticated;
revoke execute on function public.agent_ia_de_la_conversation(uuid)
  from public, anon, authenticated;

-- Les points de saisie de l'IA. Ouverte, elle laissait n'importe qui faire
-- apparaître « elle écrit… » dans la conversation d'autrui.
revoke execute on function public.diffuser_saisie(uuid, text)
  from public, anon, authenticated;

-- Réorganisation des photos : appelée par un déclencheur, jamais à la main.
revoke execute on function public.appliquer_confidentialite_photos(uuid)
  from public, anon, authenticated;

-- Fonctions de déclencheur : aucun appel direct n'a de sens.
revoke execute on function public.diffuser_message()
  from public, anon, authenticated;
revoke execute on function public.photos_confidentialite_auto()
  from public, anon, authenticated;

-- Réveil de l'assistant, posée hors dépôt car elle porte un secret. Le `do`
-- évite d'échouer là où elle n'aurait pas été créée.
do $$
begin
  if to_regprocedure('public.declencher_ia()') is not null then
    execute 'revoke execute on function public.declencher_ia() from public, anon, authenticated';
  end if;
end $$;

-- ------------------------------------------- ouvert, mais aux seuls connectés
-- Ces trois-là, le membre les appelle lui-même. Elles vérifient son identité
-- par `auth.uid()` ; un visiteur anonyme n'a malgré tout rien à y faire.
revoke execute on function public.envoyer_message_membre(uuid, text, text) from public, anon;
revoke execute on function public.envoyer_cadeau_membre(uuid, text)        from public, anon;
revoke execute on function public.debloquer_photo(uuid)                    from public, anon;

grant execute on function public.envoyer_message_membre(uuid, text, text) to authenticated;
grant execute on function public.envoyer_cadeau_membre(uuid, text)        to authenticated;
grant execute on function public.debloquer_photo(uuid)                    to authenticated;

-- Les aides du RLS restent ouvertes aux deux rôles : une politique s'évalue
-- avec les droits de celui qui interroge, y compris un visiteur anonyme qui
-- consulte une fiche publiée.

-- ------------------------------------------------------ pour la suite
-- La cause du trou, et non seulement ses effets : sans ceci, la prochaine
-- fonction créée dans `public` repartirait ouverte à tous.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
