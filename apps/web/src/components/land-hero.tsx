"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandSprout } from "@/components/brand-sprout";

/** Wordmark: Programeint = programa + e + mente (abreviado). */
function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <p className={`brand-wm ${className}`.trim()}>
      <span className="brand-wm__name" aria-label="Programeint">
        <span className="brand-wm__program">Program</span>
        <span className="brand-wm__e">e</span>
        <span className="brand-wm__int">int</span>
      </span>
    </p>
  );
}

export function LandHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReady(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`land${ready ? " is-ready" : ""}`}>
      <div className="land__atmosphere" aria-hidden="true">
        <span className="land__mesh" />
        <span className="land__glow land__glow--a" />
        <span className="land__glow land__glow--b" />
        <span className="land__glow land__glow--c" />
        <span className="land__grain" />
        <span className="land__vignette" />
      </div>

      <div className="land__stage">
        <div className="land__visual" aria-hidden="true">
          <div className="land__halo" />
          <div className="land__plant-wrap">
            <BrandSprout className="land__plant" />
          </div>
        </div>

        <div className="land__copy">
          <div className="land__reveal land__reveal--1">
            <BrandWordmark className="brand-wm--hero" />
          </div>
          <h1 className="land__title land__reveal land__reveal--2">
            Código e mente,
            <span className="land__title-em"> no mesmo ritmo.</span>
          </h1>
          <p className="land__lede land__reveal land__reveal--3">
            Estuda programação, IA e o mercado tech com mapa, prática e news reais — um
            objectivo de cada vez.
          </p>
          <div className="land__actions land__reveal land__reveal--4">
            <Link className="btn btn-primary land__cta" href="/criar-conta">
              Criar conta
              <span className="land__cta-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="btn land__cta-ghost" href="/entrar">
              Entrar
            </Link>
          </div>
          <p className="land__oss land__reveal land__reveal--5">
            <span className="land__oss-mark">open source</span>
            <Link className="land__oss-link" href="/contribuir">
              Contribui e ajuda a melhorar
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
