"use client";

import { useActionState, useEffect, useState } from "react";
import { enviarContato } from "@/app/comunicacao/actions";

type EstadoBrasil = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const estadosBrasil: EstadoBrasil[] = [
  { id: 12, sigla: "AC", nome: "Acre" }, { id: 27, sigla: "AL", nome: "Alagoas" },
  { id: 16, sigla: "AP", nome: "Amapá" }, { id: 13, sigla: "AM", nome: "Amazonas" },
  { id: 29, sigla: "BA", nome: "Bahia" }, { id: 23, sigla: "CE", nome: "Ceará" },
  { id: 53, sigla: "DF", nome: "Distrito Federal" }, { id: 32, sigla: "ES", nome: "Espírito Santo" },
  { id: 52, sigla: "GO", nome: "Goiás" }, { id: 21, sigla: "MA", nome: "Maranhão" },
  { id: 51, sigla: "MT", nome: "Mato Grosso" }, { id: 50, sigla: "MS", nome: "Mato Grosso do Sul" },
  { id: 31, sigla: "MG", nome: "Minas Gerais" }, { id: 15, sigla: "PA", nome: "Pará" },
  { id: 25, sigla: "PB", nome: "Paraíba" }, { id: 41, sigla: "PR", nome: "Paraná" },
  { id: 26, sigla: "PE", nome: "Pernambuco" }, { id: 22, sigla: "PI", nome: "Piauí" },
  { id: 33, sigla: "RJ", nome: "Rio de Janeiro" }, { id: 24, sigla: "RN", nome: "Rio Grande do Norte" },
  { id: 43, sigla: "RS", nome: "Rio Grande do Sul" }, { id: 11, sigla: "RO", nome: "Rondônia" },
  { id: 14, sigla: "RR", nome: "Roraima" }, { id: 42, sigla: "SC", nome: "Santa Catarina" },
  { id: 35, sigla: "SP", nome: "São Paulo" }, { id: 28, sigla: "SE", nome: "Sergipe" },
  { id: 17, sigla: "TO", nome: "Tocantins" },
];

export function ContactForm() {
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipiosDaUf, setMunicipiosDaUf] = useState("");
  const [estadoForm, action, pendente] = useActionState(enviarContato, {});
  const carregando = Boolean(estado) && municipiosDaUf !== estado;

  useEffect(() => {
    if (!estado) return;
    const uf = estadosBrasil.find((item) => item.sigla === estado);
    if (!uf) return;
    const controller = new AbortController();

    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.id}/municipios?orderBy=nome`, {
      signal: controller.signal,
    })
      .then((resposta) => {
        if (!resposta.ok) throw new Error("Falha ao carregar municípios");
        return resposta.json() as Promise<Municipio[]>;
      })
      .then((dados) => {
        setMunicipios(dados);
        setMunicipiosDaUf(estado);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMunicipios([]);
          setMunicipiosDaUf(estado);
        }
      });

    return () => controller.abort();
  }, [estado]);

  return (
    <form action={action} className="communication-form">
      <label className="admin-field">Nome<input name="nome" autoComplete="name" maxLength={120} required /></label>
      <label className="admin-field">E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <div className="contact-location-grid">
        <label className="admin-field">
          Estado (opcional)
          <select name="estado" value={estado} onChange={(event) => { setEstado(event.target.value); setCidade(""); setMunicipios([]); setMunicipiosDaUf(""); }}>
            <option value="">Não informar</option>
            {estadosBrasil.map((item) => <option key={item.sigla} value={item.sigla}>{item.nome}</option>)}
          </select>
        </label>
        <label className="admin-field">
          Município (opcional)
          <select name="cidade" value={cidade} onChange={(event) => setCidade(event.target.value)} disabled={!estado || carregando || !municipios.length}>
            <option value="">{carregando ? "Carregando municípios..." : estado ? "Não informar" : "Selecione uma UF para escolher"}</option>
            {municipios.map((municipio) => <option key={municipio.id} value={municipio.nome}>{municipio.nome}</option>)}
          </select>
        </label>
      </div>
      {estado && !carregando && !municipios.length && <p className="form-error">Não foi possível carregar os municípios. Tente novamente.</p>}
      <label className="admin-field">
        Motivo do contato
        <select name="motivo" defaultValue="" required>
          <option value="" disabled>Selecione</option>
          <option value="sugestao">Sugestão</option>
          <option value="reclamacao">Reclamação</option>
          <option value="pedido">Pedido</option>
          <option value="parceria_midia">Parceria de mídia</option>
        </select>
      </label>
      <label className="admin-field">Mensagem<textarea name="mensagem" rows={5} maxLength={5000} required /></label>
      <label className="honeypot" aria-hidden="true">Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {estadoForm.erro && <p role="alert" className="form-error">{estadoForm.erro}</p>}
      {estadoForm.sucesso && <p role="status" className="form-success">Mensagem enviada. Nossa equipe recebeu seu contato.</p>}
      <button className="form-submit" type="submit" disabled={pendente || carregando}>{pendente ? "Enviando..." : "Enviar mensagem"}</button>
      <p className="form-disclaimer">Dúvidas sobre uma compra devem ser tratadas diretamente com o marketplace ou vendedor.</p>
    </form>
  );
}