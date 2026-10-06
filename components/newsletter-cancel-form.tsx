"use client";

import { useActionState } from "react";
import { cancelarInscricao } from "@/app/comunicacao/actions";

export function NewsletterCancelForm({ token }: { token: string }) {
  const [estado, action, pendente] = useActionState(cancelarInscricao, {});

  if (estado.sucesso) {
    return <p role="status">Se o link for válido, a inscrição foi cancelada.</p>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {estado.erro && <p role="alert" className="form-error">{estado.erro}</p>}
      <button type="submit" className="form-submit" disabled={pendente}>
        {pendente ? "Processando..." : "Confirmar descadastro"}
      </button>
    </form>
  );
}