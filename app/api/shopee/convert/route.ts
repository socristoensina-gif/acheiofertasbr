import { getAdminUser } from "@/lib/admin/auth";
import {
  gerarLinkAfiliadoShopee,
  ShopeeIntegrationError,
} from "@/lib/integracoes/shopee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const HEADERS_SEM_CACHE = {
  "cache-control": "no-store, max-age=0",
};

function resposta(
  body: { affiliateLink?: string; error?: string; code?: string },
  status: number,
) {
  return Response.json(body, { status, headers: HEADERS_SEM_CACHE });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return resposta({ error: "Autenticação administrativa obrigatória." }, 401);

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return resposta({ error: "Origem da solicitação não permitida." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return resposta({ error: "Formato da solicitação inválido." }, 415);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return resposta({ error: "A solicitação excede o limite permitido." }, 413);
  }

  const requestText = await request.text();
  if (new TextEncoder().encode(requestText).byteLength > 4096) {
    return resposta({ error: "A solicitação excede o limite permitido." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(requestText);
  } catch {
    return resposta({ error: "Informe um JSON válido." }, 400);
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("originUrl" in body) ||
    typeof body.originUrl !== "string"
  ) {
    return resposta({ error: "Informe a URL de origem do produto." }, 400);
  }

  try {
    const affiliateLink = await gerarLinkAfiliadoShopee(body.originUrl);
    return resposta({ affiliateLink }, 200);
  } catch (error) {
    if (!(error instanceof ShopeeIntegrationError)) throw error;

    const failures = {
      NOT_CONFIGURED: {
        status: 503,
        message: "A integração Shopee ainda não está configurada no servidor.",
      },
      INVALID_URL: {
        status: 400,
        message: "Informe uma URL HTTPS válida de produto da Shopee Brasil.",
      },
      UPSTREAM_UNAVAILABLE: {
        status: 502,
        message: "A API da Shopee está indisponível. Tente novamente ou use o cadastro manual.",
      },
      UPSTREAM_REJECTED: {
        status: 502,
        message: "A API da Shopee rejeitou a solicitação. Confira a conta e a URL do produto.",
      },
      MISSING_PRODUCT_IDS: {
        status: 400,
        message: "Não foi possível identificar o produto Shopee na URL.",
      },
      PRODUCT_NOT_FOUND: {
        status: 404,
        message: "A API da Shopee não encontrou uma oferta para esse produto.",
      },
      INVALID_RESPONSE: {
        status: 502,
        message: "A API da Shopee retornou uma resposta inválida.",
      },
    } as const;
    const failure = failures[error.code];
    return resposta({ code: error.code, error: failure.message }, failure.status);
  }
}
