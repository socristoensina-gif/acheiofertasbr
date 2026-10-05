"use client";

import { useSyncExternalStore } from "react";
import { ProdutoCard } from "@/components/produto-card";
import { getFavoritosSnapshot, subscribeFavoritos } from "@/lib/favoritos";

type Produto = {
  id: string | number;
  slug: string;
  nome: string;
  imagem: string | null;
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
  marketplace?: string | null;
};

export function FavoriteList({ produtos }: { produtos: Produto[] }) {
  const snapshot = useSyncExternalStore(subscribeFavoritos, getFavoritosSnapshot, () => "[]");
  let ids: string[] = [];
  try {
    ids = JSON.parse(snapshot);
  } catch {
    ids = [];
  }

  const favoritos = produtos.filter((produto) => ids.includes(String(produto.id)));

  return favoritos.length ? (
    <div className="product-grid">
      {favoritos.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
    </div>
  ) : (
    <p className="empty-state">Seus favoritos salvos neste dispositivo aparecerão aqui.</p>
  );
}