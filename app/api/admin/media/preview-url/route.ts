import { getAdminUser } from "@/lib/admin/auth";
import { MEDIA_BUCKET, validMediaStoragePath } from "@/lib/media/config";
import { supabaseAdmin } from "@/utils/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return response({ error: "Autenticação administrativa obrigatória." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return response({ error: "Origem da solicitação não permitida." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Formato da solicitação inválido." }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Informe um JSON válido." }, 400);
  }
  const path = body && typeof body === "object" && "path" in body && typeof body.path === "string"
    ? body.path
    : "";
  if (!validMediaStoragePath(path)) {
    return response({ error: "Caminho de mídia inválido." }, 400);
  }

  const { data, error } = await supabaseAdmin()
    .storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, 900);
  if (error) {
    console.error("Falha ao gerar prévia administrativa de mídia.", {
      name: error.name,
      status: error.status,
      code: error.statusCode,
    });
    return response({
      error: error.status === 404 || error.statusCode === "404"
        ? "O bucket produto-midias não existe no Supabase. Aplique a migration 20261007000600_storage_midias.sql."
        : "Não foi possível abrir a prévia do arquivo enviado.",
    }, 503);
  }
  return response({ previewUrl: data.signedUrl }, 200);
}
