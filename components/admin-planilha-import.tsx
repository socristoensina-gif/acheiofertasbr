"use client";

import { useActionState, useState } from "react";
import { processarPlanilha, type EstadoPlanilha } from "@/app/admin/planilha/actions";

const inicial: EstadoPlanilha = { modo: "validar", linhas: [] };

export function AdminPlanilhaImport() {
  const [estado, acao, pendente] = useActionState(processarPlanilha, inicial);
  const [texto, setTexto] = useState("");

  return (
    <form action={acao} className="grid gap-4">
      <label className="admin-field">
        Cole aqui as células da planilha (incluindo a linha de títulos)
        <textarea
          name="planilha"
          rows={12}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </label>
      <label className="text-sm">
        Ou escolha um arquivo .csv
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="ml-2"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) setTexto(await arquivo.text());
          }}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button name="modo" value="validar" disabled={pendente} className="rounded-md border border-stone-300 bg-white px-4 py-3 font-bold disabled:opacity-50">
          1. Validar
        </button>
        <button name="modo" value="importar" disabled={pendente} className="rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800 disabled:opacity-50">
          2. Importar
        </button>
      </div>
      {pendente && <p className="text-sm text-stone-600">Processando, aguarde...</p>}
      {estado.erro && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>}
      {estado.resumo && <p role="status" className="rounded-md bg-stone-100 p-3 text-sm font-semibold">{estado.resumo}</p>}
      {estado.linhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-300">
                <th className="py-2 pr-3">Linha</th>
                <th className="py-2 pr-3">Produto</th>
                <th className="py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {estado.linhas.map((l) => (
                <tr key={l.linha} className="border-b border-stone-100 align-top">
                  <td className="py-2 pr-3">{l.linha}</td>
                  <td className="py-2 pr-3">{l.nome}</td>
                  <td className={`py-2 ${l.ok ? "text-green-800" : "text-red-700"}`}>{l.mensagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}