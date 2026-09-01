export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

export async function waitForMailToken(to: string, pathPart: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json());
    const messages = list.messages as Array<{ ID: string; To: Array<{ Address: string }> }>;
    const candidates =
      messages?.filter((m) => m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase())) ?? [];
    for (const found of candidates) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${found.ID}`).then((r) => r.json());
      const text = String(full.Text ?? "");
      const match = text.match(new RegExp(`https?://[^\\s]+/${pathPart}\\?token=([^\\s]+)`));
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`e-mail não chegou ao Mailpit para ${to} (${pathPart})`);
}

export async function registerAndLogin(page: import("@playwright/test").Page, name: string) {
  const email = `e2e.${Date.now()}.${Math.random().toString(16).slice(2)}@programeint.test`;
  const password = "senha-segura-1";
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  const token = await waitForMailToken(email, "verificar-email");
  await page.goto(`/verificar-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
  await page.getByRole("button", { name: "Confirmar e-mail" }).click();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  return { email, password };
}
