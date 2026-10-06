export async function enviarEmailDoPortal(assunto: string, texto: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  const destinatario = process.env.CONTACT_NOTIFY_EMAIL;
  if (!apiKey || !remetente || !destinatario) return false;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [destinatario],
        subject: assunto,
        text: texto,
      }),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}