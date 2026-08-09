"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SignupTarget = { name: string; age: number; photo: string } | null;

type SignupContextValue = {
  open: (target?: SignupTarget) => void;
  close: () => void;
  isOpen: boolean;
  target: SignupTarget;
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup doit être utilisé dans <SignupProvider>");
  return ctx;
}

export function SignupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<SignupTarget>(null);

  const open = useCallback((next: SignupTarget = null) => {
    setTarget(next);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({ open, close, isOpen, target }),
    [open, close, isOpen, target],
  );

  return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function SignupModal() {
  const { isOpen, close, target } = useSignup();

  return (
    <div
      className={`modal${isOpen ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="signupTitle">
        <button className="modal-close" onClick={close} aria-label="Fermer">
          ✕
        </button>
        <h3 id="signupTitle">Créez votre compte</h3>
        <p>Inscription gratuite en 2 minutes pour envoyer votre premier message.</p>

        {target && (
          <div className="who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={target.photo} alt="" />
            <div>
              <b>
                {target.name}, {target.age}
              </b>
              <span>vous répondra dès votre inscription</span>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Étape suivante : inscription via Supabase Auth.
            alert("Démo — le formulaire sera relié à Supabase Auth.");
          }}
        >
          <input type="text" placeholder="Votre prénom" required />
          <input type="email" placeholder="Votre e-mail" required />
          <input type="password" placeholder="Mot de passe" required />
          <label className="terms">
            <input type="checkbox" required /> J&apos;accepte les conditions d&apos;utilisation et la
            politique de confidentialité, et je confirme avoir 18 ans ou plus.
          </label>
          <button className="btn-dark" type="submit">
            Créer mon compte
          </button>
        </form>
      </div>
    </div>
  );
}
