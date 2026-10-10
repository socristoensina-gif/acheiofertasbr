"use client";

import { useState } from "react";
import { AdminGaleriaMidias } from "@/components/admin-galeria-midias";

const botao = "rounded-md px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50";

export function AdminCadastroMidias() {
  const [ocupado, setOcupado] = useState(false);
  return (
    <>
      <fieldset className="grid gap-4 border-t border-stone-200 pt-5">
        <legend className="mb-3 text-lg font-bold">3. Imagens e vídeos</legend>
        <AdminGaleriaMidias onBusyChange={setOcupado} />
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button name="depois" value="lista" disabled={ocupado} className={`${botao} bg-orange-700 text-white hover:bg-orange-800`}>
          Salvar e publicar
        </button>
        <button name="depois" value="outro" disabled={ocupado} className={`${botao} border border-stone-300 bg-white`}>
          Salvar e cadastrar outro
        </button>
      </div>
      {ocupado && <p className="text-sm text-stone-600">Aguarde o envio dos arquivos para salvar.</p>}
    </>
  );
}