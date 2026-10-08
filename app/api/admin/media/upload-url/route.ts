import { getAdminUser } from "@/lib/admin/auth";
import {
  MEDIA_BUCKET,
  MEDIA_FILE_TYPES,
  MAX_MEDIA_FILE_SIZE,
  type MediaKind,
} from "@/lib/media/config";
import { supabaseAdmin } from "@/utils/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

function response(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return response({ error: "Autenticação administrativa obrigatória." }, 401);

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return response({ error: "Origem da solicitação não permitida." }, 403);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return response({ error: "Origem da solicitação não permitida." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Formato da solicitação inválido." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return response({ error: "A solicitação excede o limite permitido." }, 413);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return response({ error: "Informe um JSON válido." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return response({ error: "Informe os dados do arquivo." }, 400);
  }

  const body = input as Record<string, unknown>;
  const kind = body.kind;
  const contentType = body.contentType;
  const fileSize = body.fileSize;
  if (
    (kind !== "image" && kind !== "video") ||
    typeof contentType !== "string" ||
    !(contentType in MEDIA_FILE_TYPES[kind as MediaKind]) ||
    typeof fileSize !== "number" ||
    !Number.isSafeInteger(fileSize) ||
    fileSize < 1 ||
    fileSize > MAX_MEDIA_FILE_SIZE
  ) {
    return response({ error: "Tipo ou tamanho de arquivo não permitido." }, 400);
  }

  const extension = MEDIA_FILE_TYPES[kind as MediaKind][contentType as keyof typeof MEDIA_FILE_TYPES[MediaKind]];
  const path = `${kind}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin()
    .storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Não foi possível preparar o envio de mídia do admin.", error.name);
    return response({ error: "O armazenamento de mídia não está pronto. Tente novamente mais tarde." }, 503);
  }

  return response({ path: data.path, token: data.token }, 201);
}
