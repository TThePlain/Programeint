import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>("SMTP_HOST") ?? "127.0.0.1",
      port: Number(config.get<string>("SMTP_PORT") ?? 1025),
      secure: false,
    });
    this.from = config.get<string>("SMTP_FROM") ?? "Programeint <nao-responder@programeint.local>";
    this.appUrl = config.get<string>("APP_URL") ?? "http://localhost:3000";
  }

  verificationUrl(token: string) {
    return `${this.appUrl}/verificar-email?token=${encodeURIComponent(token)}`;
  }

  resetUrl(token: string) {
    return `${this.appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  }

  async sendVerification(to: string, name: string, token: string) {
    const url = this.verificationUrl(token);
    await this.send(to, "Confirma o teu e-mail no Programeint", [
      `Olá ${name},`,
      "",
      "Confirma o teu e-mail para começares a usar o Programeint:",
      url,
      "",
      "Este link expira em 24 horas.",
      "Se não criaste esta conta, ignora este e-mail.",
    ].join("\n"));
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const url = this.resetUrl(token);
    await this.send(to, "Redefinir senha — Programeint", [
      `Olá ${name},`,
      "",
      "Recebemos um pedido para redefinir a tua senha:",
      url,
      "",
      "Este link expira em 1 hora e só pode ser usado uma vez.",
      "Se não foste tu, ignora este e-mail. A tua senha permanece igual.",
    ].join("\n"));
  }

  private async send(to: string, subject: string, text: string) {
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
    });
    this.logger.log(`e-mail enviado id=${info.messageId} to_hash=${hashHint(to)}`);
  }
}

function hashHint(value: string) {
  return `${value.length}:${value.slice(0, 2)}***`;
}
