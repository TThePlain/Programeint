import { describe, expect, it } from "vitest";
import {
  RESOURCE_LICENSES,
  licenseInfo,
  listableRejection,
  resourceIsListable,
} from "./library";

const base = {
  title: "Documentação do Spring Framework",
  url: "https://docs.spring.io/spring-framework/reference/",
  license: "Apache-2.0",
  kind: "docs",
  official: true,
};

describe("licenseInfo", () => {
  it("devolve a licença canónica com URL real", () => {
    expect(licenseInfo("Apache-2.0")?.url).toBe("https://www.apache.org/licenses/LICENSE-2.0");
  });

  it("devolve null para licença fora do catálogo", () => {
    expect(licenseInfo("qualquer-coisa")).toBeNull();
    expect(licenseInfo("")).toBeNull();
  });

  it("marca licenças não redistribuíveis como tal", () => {
    expect(RESOURCE_LICENSES["CC-BY-NC-SA-3.0"].redistributable).toBe(false);
    expect(RESOURCE_LICENSES["Apache-2.0"].redistributable).toBe(true);
  });
});

describe("listableRejection", () => {
  it("aceita recurso oficial, https e com licença conhecida", () => {
    expect(listableRejection(base)).toBeNull();
    expect(resourceIsListable(base)).toBe(true);
  });

  it("recusa http sem TLS", () => {
    expect(listableRejection({ ...base, url: "http://docs.spring.io/" })).toBe("url_insegura");
  });

  it("recusa licença desconhecida", () => {
    expect(listableRejection({ ...base, license: "todos-os-direitos" })).toBe(
      "licenca_desconhecida",
    );
  });

  it("recusa tipo fora do catálogo", () => {
    expect(listableRejection({ ...base, kind: "torrent" })).toBe("tipo_desconhecido");
  });

  it("recusa cópia não oficial mesmo com licença válida", () => {
    expect(listableRejection({ ...base, official: false })).toBe("fonte_nao_oficial");
    expect(resourceIsListable({ ...base, official: false })).toBe(false);
  });
});
