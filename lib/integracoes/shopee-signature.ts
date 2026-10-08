import { createHash } from "node:crypto";

export function assinarRequisicaoShopee(
  appId: string,
  timestamp: string,
  body: string,
  secretKey: string,
) {
  return createHash("sha256")
    .update(`${appId}${timestamp}${body}${secretKey}`)
    .digest("hex");
}

export function authorizationShopee(
  appId: string,
  timestamp: string,
  body: string,
  secretKey: string,
) {
  const signature = assinarRequisicaoShopee(appId, timestamp, body, secretKey);
  return `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;
}
