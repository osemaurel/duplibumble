-- Une photo envoyée coûte plus qu'un message : le relevé doit pouvoir le dire.
-- Isolée dans sa propre migration car une valeur d'énumération ne peut pas être
-- ajoutée et utilisée dans la même transaction.
alter type public.credit_reason add value if not exists 'photo';
