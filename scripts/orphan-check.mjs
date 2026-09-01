#!/usr/bin/env node
/**
 * Orphan detection — compara registries com o código.
 * Exit 1 se features/botões implementados não estiverem registados.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function has(rel) {
  return existsSync(join(root, rel));
}

const functional = read("docs/FUNCTIONAL_REGISTRY.md");
const buttons = read("docs/BUTTON_REGISTRY.md");
const sharedFeatures = read("packages/shared/src/features.ts");

const featureIds = [...sharedFeatures.matchAll(/([A-Z][A-Z0-9_]+):\s*"\1"/g)].map((m) => m[1]);
for (const id of featureIds) {
  if (!functional.includes(`| ${id} |`)) {
    problems.push(`FEATURE ${id} em packages/shared mas ausente do FUNCTIONAL_REGISTRY`);
  }
}

const checks = [
  ["apps/web/src/app/conta/page.tsx", "ACCOUNT_EXPORT_001", "BTN_ACCOUNT_EXPORT"],
  ["apps/api/src/account/account.controller.ts", "ACCOUNT_DELETE_001", "BTN_ACCOUNT_DELETE"],
  ["apps/web/src/components/github-publish-button.tsx", "GITHUB_PUBLISH_001", "BTN_GITHUB_PUBLISH"],
  ["apps/web/src/app/agenda/page.tsx", "CALENDAR_LIST_001", "BTN_NAV_AGENDA"],
];

for (const [file, featureId, buttonId] of checks) {
  if (!has(file)) {
    problems.push(`Falta ${file}`);
    continue;
  }
  if (!functional.includes(featureId)) {
    problems.push(`${file} existe mas ${featureId} ausente do FUNCTIONAL_REGISTRY`);
  }
  if (!buttons.includes(buttonId)) {
    problems.push(`${file} existe mas ${buttonId} ausente do BUTTON_REGISTRY`);
  }
}

if (problems.length) {
  console.error("ORPHAN / REGISTRY gaps:");
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}

const buttonIds = [...buttons.matchAll(/\|\s*(BTN_[A-Z0-9_]+)\s*\|/g)].map((m) => m[1]);
console.log(
  `orphan-check ok · ${featureIds.length} FEATURE constants · ${buttonIds.length} button rows`,
);
