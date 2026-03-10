import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'BrandMind <no-reply@brandmind.com.br>',
    to,
    subject: 'Recuperação de senha — BrandMind',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Inter, Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
    <div style="background: #4f46e5; padding: 32px 40px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #fff; font-size: 20px;">⚡</span>
        </div>
        <span style="color: #fff; font-size: 22px; font-weight: 700;">BrandMind</span>
      </div>
    </div>
    <div style="padding: 40px;">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #18181b;">Olá, ${name}!</h2>
      <p style="margin: 0 0 24px; color: #71717a; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
      </p>
      <a href="${resetUrl}" style="display: block; text-align: center; background: #4f46e5; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;">
        Redefinir minha senha
      </a>
      <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 13px; line-height: 1.6;">
        Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.<br/><br/>
        Ou copie e cole o link abaixo no navegador:<br/>
        <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div style="padding: 20px 40px; border-top: 1px solid #f4f4f5; text-align: center;">
      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© ${new Date().getFullYear()} BrandMind. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });
}
