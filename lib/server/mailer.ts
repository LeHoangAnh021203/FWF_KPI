import "server-only";

import nodemailer from "nodemailer";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

function getFirstEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getSmtpConfig() {
  return {
    host: getFirstEnv("SMTP_HOST", "EMAIL_HOST") ?? getRequiredEnv("SMTP_HOST"),
    port: Number(getFirstEnv("SMTP_PORT", "EMAIL_PORT") ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: getFirstEnv("SMTP_USER", "EMAIL_USER") ?? getRequiredEnv("SMTP_USER"),
    pass: getFirstEnv("SMTP_PASS", "EMAIL_PASSWORD") ?? getRequiredEnv("SMTP_PASS"),
    from:
      getFirstEnv("SMTP_FROM", "EMAIL_FROM") ??
      getFirstEnv("SMTP_USER", "EMAIL_USER") ??
      getRequiredEnv("SMTP_USER")
  };
}

export function isOtpEmailConfigured() {
  return Boolean(
    getFirstEnv("SMTP_HOST", "EMAIL_HOST") &&
      getFirstEnv("SMTP_USER", "EMAIL_USER") &&
      getFirstEnv("SMTP_PASS", "EMAIL_PASSWORD")
  );
}

export async function sendOtpEmail({
  email,
  name,
  otp
}: {
  email: string;
  name: string;
  otp: string;
}) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  await transporter.sendMail({
    from: smtp.from,
    to: email,
    subject: "Mã OTP xác minh tài khoản Face Wash Fox",
    text: `Xin chào ${name}, mã OTP của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Xác minh tài khoản Face Wash Fox</h2>
        <p>Xin chào ${name},</p>
        <p>Mã OTP để xác minh tài khoản của bạn là:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
        <p>Mã có hiệu lực trong 5 phút.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
      </div>
    `
  });
}
