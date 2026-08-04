import nodemailer from 'nodemailer';

// Usa Gmail como servidor de envio (SMTP). Precisa de:
// - EMAIL_USER: o endereço Gmail que vai enviar os emails
// - EMAIL_APP_PASSWORD: uma "senha de app" gerada nas configurações de
//   segurança da conta Google (NÃO é a senha normal do Gmail).
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  connectionTimeout: 10000, // 10s para conectar no servidor do Gmail
  greetingTimeout: 10000,   // 10s para o "handshake" inicial
  socketTimeout: 15000      // 15s de inatividade antes de desistir
});

export async function sendMail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('EMAIL_USER/EMAIL_APP_PASSWORD não configurados — email não foi enviado.');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"SENAI Zerbini Estoque" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`E-mail enviado com sucesso para ${to}`);
  } catch (err) {
    console.error('Erro ao enviar e-mail via Gmail:', err.message);
    throw err; // deixa o authController tratar (ele já tem try/catch)
  }
}