import { getAdminUser } from "@/lib/admin/auth";
import { normalizarCapturaManual } from "@/lib/importacoes/captura-manual";
import { supabaseAdmin } from "@/utils/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_BODY_BYTES = 32_768;
const RESPONSE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

function resposta(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

async function lerJsonLimitado(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { ok: false as const, tooLarge: true };
  }
  if (!request.body) return { ok: false as const, tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false as const, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true as const, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false as const, tooLarge: false };
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return resposta({ error: "Autenticação administrativa obrigatória." }, 401);

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return resposta({ error: "Origem da solicitação não permitida." }, 403);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return resposta({ error: "Origem da solicitação não permitida." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return resposta({ error: "Formato da solicitação inválido." }, 415);
  }

  const parsedBody = await lerJsonLimitado(request);
  if (!parsedBody.ok) {
    return parsedBody.tooLarge
      ? resposta({ error: "A solicitação excede o limite permitido." }, 413)
      : resposta({ error: "Informe um JSON válido." }, 400);
  }
  const body = parsedBody.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return resposta({ error: "O JSON deve conter um objeto de dados." }, 400);
  }
  const input = body as Record<string, unknown>;
  const method = input.method;
  if (method !== "assistida" && method !== "manual") {
    return resposta({ error: "Selecione captura assistida ou cadastro manual." }, 400);
  }
  const normalized = normalizarCapturaManual(input.data, method);
  if (!normalized) {
    return resposta({
      error: "Dados inválidos. Verifique título, preço, imagem HTTPS e link permitido do marketplace.",
    }, 400);
  }

  const { data, error } = await supabaseAdmin()
    .from("importacoes_ofertas")
    .insert({
      marketplace_id: normalized.previa.marketplace_id,
      tipo_importacao: "link",
      url_origem: normalized.previa.url_origem,
      status: "aguardando_revisao",
      dados_brutos: normalized.raw,
      dados_processados: normalized.previa,
      erro: null,
      criado_por: admin.id,
      processado_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  return resposta({ importacaoId: data.id }, 201);
}
