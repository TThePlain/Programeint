import { expect, test, type Page } from "@playwright/test";
import { registerAndLogin } from "./helpers";

const SOLUTION_TWICE = `public class Solution {
  public static int twice(int n) {
    return n * 2;
  }
}
`;

const SOLUTION_HELLO = `public class Main {
  public static void main(String[] args) {
    System.out.println("Olá, JVM");
  }
}
`;

const CATALOG = `public class Catalog {
  private Task[] tasks = new Task[0];

  public void add(String title) {
    Task[] next = new Task[tasks.length + 1];
    System.arraycopy(tasks, 0, next, 0, tasks.length);
    next[tasks.length] = new Task(title, false);
    tasks = next;
  }

  public void complete(int index) {
    Task current = tasks[index];
    Task[] next = new Task[tasks.length];
    System.arraycopy(tasks, 0, next, 0, tasks.length);
    next[index] = new Task(current.title(), true);
    tasks = next;
  }

  public int size() {
    return tasks.length;
  }

  public int pendingCount() {
    int n = 0;
    for (Task task : tasks) {
      if (!task.done()) n++;
    }
    return n;
  }

  public String titles() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < tasks.length; i++) {
      if (i > 0) sb.append('\\n');
      sb.append(tasks[i].title());
    }
    return sb.toString();
  }
}
`;

async function fillEditor(
  locator: ReturnType<Page["getByLabel"]> | ReturnType<Page["locator"]>,
  value: string,
  proof: RegExp,
) {
  await expect(locator).toBeVisible();
  await locator.fill(value);
  await expect(locator).toHaveValue(proof);
}

test("projeto Java gera evidência no portfólio, não certificado", async ({ page }) => {
  test.setTimeout(180_000);
  await registerAndLogin(page, "Aluno Portfólio");
  await page.getByLabel("O que queres aprender?").fill("Quero aprender Java para backend.");
  await page.getByRole("radio", { name: "Java", exact: true }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Iniciante" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gravar objetivo" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

  await page.getByRole("link", { name: /diagnóstico/i }).click();
  for (let i = 0; i < 8; i += 1) {
    if (await page.getByText("Diagnóstico concluído").isVisible()) break;
    const responder = page.getByRole("button", { name: "Responder" });
    await expect(responder).toBeVisible({ timeout: 10_000 });
    await page.locator("label.choice").first().click();
    await expect(responder).toBeEnabled();
    await responder.click();
    await expect(page.getByRole("button", { name: "A gravar…" })).toHaveCount(0);
  }
  await expect(page.getByText("Diagnóstico concluído")).toBeVisible();
  await page.getByRole("link", { name: "O que fazer agora" }).click();

  for (let i = 0; i < 16; i += 1) {
    if (/\/projeto\//.test(page.url())) break;
    await expect(page).toHaveURL(/\/app/);
    const project = page.getByRole("link", { name: /Abrir projeto / });
    const lab = page.getByRole("link", { name: /Praticar .* no lab/ });
    const study = page.getByRole("link", { name: /^Estudar / });
    await expect(project.or(lab).or(study)).toBeVisible();
    if (await project.isVisible()) {
      await project.click();
      break;
    }
    if (await lab.isVisible()) {
      await lab.click();
      await expect(page).toHaveURL(/\/lab\//);
      await expect(page.getByRole("heading", { name: "Laboratório" })).toBeVisible();
      await expect(page.getByText(/execução Docker/)).toBeVisible();
      const editor = page.locator("textarea.code-editor").first();
      if (page.url().includes("algo-twice")) {
        await expect(editor).toHaveValue(/return 0/);
        await fillEditor(editor, SOLUTION_TWICE, /n \* 2/);
      } else if (page.url().includes("java-hello")) {
        await expect(editor).toHaveValue(/TODO/);
        await fillEditor(editor, SOLUTION_HELLO, /Olá, JVM/);
      }
      await page.getByRole("button", { name: "Compilar e testar" }).click();
      const blocked = page.getByText(/BLOCKED\/CONFIGURATION_REQUIRED|imagem .* em falta|Docker\/Lima/);
      const passed = page.getByText("Testes passaram na JVM isolada");
      await expect(blocked.or(passed)).toBeVisible({ timeout: 60_000 });
      if (await blocked.isVisible()) return;
      await page.getByRole("link", { name: "O que fazer agora" }).click();
      continue;
    }
    await study.click();
    await page.getByRole("button", { name: "Concluí a leitura" }).click();
    await expect(page.getByRole("button", { name: "Verificar" })).toBeVisible();
    await page.locator("label.choice").first().click();
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText("Módulo verificado")).toBeVisible();
    await page.getByRole("link", { name: "O que fazer agora" }).click();
  }

  await expect(page).toHaveURL(/\/projeto\//);
  await expect(page.getByRole("heading", { name: "Projeto" })).toBeVisible();
  await expect(page.getByText("Java 21 · execução Docker isolada · não é certificado")).toBeVisible();
  const catalog = page.getByLabel("Catalog.java");
  await expect(catalog).toHaveValue(/TODO/);
  await fillEditor(catalog, CATALOG, /System\.arraycopy/);
  await page.getByRole("button", { name: "Correr testes do projeto" }).click();
  await expect(
    page.getByText(
      /Testes do projeto passaram na JVM isolada|BLOCKED\/CONFIGURATION_REQUIRED|imagem .* em falta|Docker\/Lima/,
    ),
  ).toBeVisible({ timeout: 60_000 });
  if (await page.getByText(/BLOCKED\/CONFIGURATION_REQUIRED/).isVisible()) return;

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Portfólio" }).click();
  await expect(page.getByRole("heading", { name: "Portfólio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidência" })).toBeVisible();
  await expect(page.getByText("Testes isolados passaram nesta JVM Docker")).toBeVisible();
  await expect(page.getByText("Só entra evidência de testes isolados que passaram.")).toBeVisible();
});
