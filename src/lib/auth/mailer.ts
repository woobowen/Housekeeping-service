import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host: string | undefined = process.env.SMTP_HOST;
  const port: string | undefined = process.env.SMTP_PORT;
  const user: string | undefined = process.env.SMTP_USER;
  const pass: string | undefined = process.env.SMTP_PASS;
  const from: string | undefined = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  };
}

export async function sendRegisterVerificationCode(email: string, code: string): Promise<void> {
  const subject: string = 'HouseCare-Pro 管理员注册验证码';
  const text: string = `您的验证码为 ${code}，10 分钟内有效。若非本人操作，请忽略本邮件。`;
  const smtpConfig: SmtpConfig | null = getSmtpConfig();

  if (!smtpConfig) {
    console.log('【系统级模拟邮件】发送给', email, '验证码为:', code);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.from,
      to: email,
      subject,
      text,
    });
  } catch (error) {
    console.error('发送验证码邮件失败，已退回到控制台模拟发送:', error);
    console.log('【系统级模拟邮件】发送给', email, '验证码为:', code);
  }
}
