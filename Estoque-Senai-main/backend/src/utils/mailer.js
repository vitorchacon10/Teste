// Usa a API do Brevo (HTTPS) para enviar e-mails, em vez de SMTP direto.
// Isso é necessário porque o Render (plano free) bloqueia conexões SMTP
// de saída (portas 587/465), causando ETIMEDOUT com Gmail/Nodemailer.
//
// Diferente do Resend, o Brevo NÃO exige domínio verificado para enviar
// para qualquer destinatário — funciona com o remetente que você
// verificar (ver EMAIL_FROM abaixo).
//
// Variáveis necessárias no .env / Render:
// - BREVO_API_KEY: chave gerada em app.brevo.com -> SMTP & API -> API Keys
// - EMAIL_FROM: o e-mail remetente. Deve ser um e-mail verificado como
//   "Sender" na sua conta Brevo (Settings -> Senders, Domains & Dedicated IPs
//   -> Senders -> Add a Sender). Pode ser o seu próprio Gmail, por exemplo.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendMail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY não configurada — email não foi enviado.');
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn('EMAIL_FROM não configurado — email não foi enviado.');
    return;
  }

  try {
    const resposta = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'SENAI Zerbini Estoque', email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      console.error('Erro ao enviar e-mail via Brevo:', resposta.status, dados);
      throw new Error(dados.message || `Erro ${resposta.status} ao enviar e-mail`);
    }

    console.log(`E-mail enviado com sucesso para ${to} (id: ${dados.messageId})`);
  } catch (err) {
    console.error('Erro ao enviar e-mail via Brevo:', err.message);
    throw err;
  }
}