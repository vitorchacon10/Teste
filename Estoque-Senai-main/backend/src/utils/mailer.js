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
  }
});

export async function sendMail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('EMAIL_USER/EMAIL_APP_PASSWORD não configurados — email não foi enviado.');
    return;
  }

  await transporter.sendMail({
    from: `"SENAI Zerbini Estoque" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
}