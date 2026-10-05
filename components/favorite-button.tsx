"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { getFavoritosSnapshot, salvarFavoritos, subscribeFavoritos } from "@/lib/favoritos";

export function FavoriteButton({ produtoId }: { produtoId: string }) {
  const snapshot = useSyncExternalStore(
    subscribeFavoritos,
    getFavoritosSnapshot,
    () => "[]",
  );
  let favoritos: string[] = [];
  try {
    favoritos = JSON.parse(snapshot);
  } catch {
    favoritos = [];
  }
  const favorito = favoritos.includes(produtoId);

  function alternarFavorito() {
    try {
      const atualizados = favorito
        ? favoritos.filter((id) => id !== produtoId)
        : [...new Set([...favoritos, produtoId])];
      salvarFavoritos(atualizados);
    } catch {
      return;
    }
  }

  return (
    <button
      type="button"
      onClick={alternarFavorito}
      aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={favorito}
      title={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`favorite-button${favorito ? " is-favorite" : ""}`}
    >
      <Heart size={18} fill={favorito ? "currentColor" : "none"} />
    </button>
  );
}