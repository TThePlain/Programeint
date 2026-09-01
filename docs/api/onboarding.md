# Onboarding

| Método | Caminho | Auth | Request | Sucesso | Erros |
|---|---|---|---|---|---|
| GET | `/api/onboarding` | sessão | — | 200 `{ complete, goal, preferences }` | 401 |
| PUT | `/api/onboarding` | sessão | ver `onboardingSchema` | 200 estado gravado | 400 validação, 401 |

`complete` só é verdadeiro quando existe objetivo ativo **e** `study_preferences.onboardingCompletedAt`.

Auto-relato de experiência **não** é domínio. O diagnóstico virá a seguir e usa evidência.
