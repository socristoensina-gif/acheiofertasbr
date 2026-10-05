export const DOMINIOS_PERMITIDOS = [
  "shopee.com.br",
  "amazon.com.br",
  "amzn.to",
  "mercadolivre.com.br",
  "meli.la",
  "aliexpress.com",
  "magazineluiza.com.br",
  "magalu.com.br",
] as const;

export function linkAfiliadoPermitido(link: string): boolean {
  try {
    const url = new URL(link);
    const dominio = url.hostname.toLowerCase();

    return (
      url.protocol === "https:" &&
      DOMINIOS_PERMITIDOS.some(
        (permitido) => dominio === permitido || dominio.endsWith(`.${permitido}`),
      )
    );
  } catch {
    return false;
  }
}