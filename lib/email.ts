const DESTINO_CONTATO = "acheiofertas@gmail.com";

export async function enviarEmailDoPortal(assunto: string, texto: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !remetente) return false;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [DESTINO_CONTATO],
        subject: assunto,
        text: texto,
      }),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}