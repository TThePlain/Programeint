# Button Registry

Nenhum botão interativo sem ação real e sem esta linha.

| BUTTON_ID | Tela | Componente | Descrição | Evento | API | Resultado | Teste | Status |
|---|---|---|---|---|---|---|---|---|
| BTN_NAV_ENTRAR | `/` | HomeHeader | Ir para login | click → `/entrar` | — | página de login | e2e | DONE |
| BTN_NAV_CRIAR_CONTA | `/` | HomeHeader | Ir para cadastro | click → `/criar-conta` | — | página de cadastro | e2e | DONE |
| BTN_REGISTER_SUBMIT | `/criar-conta` | RegisterForm | Criar conta | submit | `POST /api/auth/register` | conta + e-mail de verificação | e2e | DONE |
| BTN_LOGIN_SUBMIT | `/entrar` | LoginForm | Autenticar | submit | `POST /api/auth/login` | cookie de sessão + `/onboarding` ou `/app` | e2e | DONE |
| BTN_LOGOUT | `/app` | LogoutButton | Encerrar sessão | click | `POST /api/auth/logout` | cookie apagado + `/` | e2e | DONE |
| BTN_VERIFY_SUBMIT | `/verificar-email` | VerifyEmailForm | Confirmar e-mail | submit | `POST /api/auth/verify-email` | e-mail verificado | e2e | DONE |
| BTN_RESEND_VERIFY | `/verificar-email` | ResendVerificationButton | Reenviar e-mail | click | `POST /api/auth/resend-verification` | novo e-mail | API | DONE |
| BTN_FORGOT_SUBMIT | `/recuperar-senha` | ForgotPasswordForm | Pedir reset | submit | `POST /api/auth/forgot-password` | e-mail enviado (mesmo se e-mail não existir) | e2e | DONE |
| BTN_RESET_SUBMIT | `/redefinir-senha` | ResetPasswordForm | Gravar nova senha | submit | `POST /api/auth/reset-password` | senha alterada, sessões revogadas | e2e | DONE |
| BTN_GOTO_FORGOT | `/entrar` | LoginForm | Ligação recuperação | click → `/recuperar-senha` | — | página recuperação | — | DONE |
| BTN_ONBOARD_NEXT | `/onboarding` | OnboardingWizard | Avançar passo | click | — | passo seguinte (validação local) | e2e | DONE |
| BTN_ONBOARD_BACK | `/onboarding` | OnboardingWizard | Voltar passo | click | — | passo anterior | e2e | DONE |
| BTN_ONBOARD_SAVE | `/onboarding` | OnboardingWizard | Gravar objetivo | submit | `PUT /api/onboarding` | objetivo persistido + `/app` | e2e | DONE |
| BTN_GOAL_EDIT | `/app` | AppHomePage | Alterar objetivo | click → `/onboarding` | GET+PUT | formulário pré-preenchido | — | DONE |
| BTN_DIAGNOSIS_START | `/app`, `/mapa` | AppHomePage / RoadmapPage | Ir ao diagnóstico | click → `/diagnostico` | `POST /api/diagnosis/sessions` | sessão + primeira questão | e2e | DONE |
| BTN_DIAGNOSIS_ANSWER | `/diagnostico` | DiagnosisClient | Gravar resposta | click | `POST /api/diagnosis/sessions/:id/answers` | feedback + próxima ou conclusão | e2e | DONE |
| BTN_DIAGNOSIS_MAP | `/diagnostico` | DiagnosisClient | Ver mapa após conclusão | click → `/mapa` | `GET /api/roadmap` | nós com evidência | e2e | DONE |
| BTN_NAV_MAPA | header | SiteHeader | Abrir mapa | click → `/mapa` | `GET /api/roadmap` | grafo do alvo | e2e | DONE |
| BTN_DIAGNOSIS_RETRY | `/mapa` | RoadmapPage | Repetir diagnóstico | click → `/diagnostico` | `POST /api/diagnosis/sessions` | nova sessão | — | DONE |
| BTN_LEARNING_NEXT | `/app` | AppHomePage | Seguir próxima ação | click → href do motor | `GET /api/learning/next` | diagnóstico, estudo ou revisão | e2e | DONE |
| BTN_STUDY_READ | `/estudar/[slug]` | StudyClient | Marcar leitura | click | `POST /api/learning/sessions/:id/read` | `readAt` persistido | e2e | DONE |
| BTN_STUDY_CHECK | `/estudar/[slug]` | StudyClient | Verificar módulo | click | `POST /api/learning/sessions/:id/check` | mastery `studied` + carta FSRS | e2e | DONE |
| BTN_MAP_STUDY_NODE | `/mapa` | RoadmapPage | Estudar nó com módulo | click → `/estudar/[slug]` | `POST /api/learning/sessions` | sessão de estudo | e2e | DONE |
| BTN_REVIEW_ANSWER | `/revisar` | ReviewClient | Responder revisão | click | `POST /api/learning/reviews` | carta FSRS atualizada | unit | DONE |
| BTN_MAP_LAB | `/mapa` | RoadmapPage | Abrir lab do nó | click → `/lab/[slug]` | `GET /api/lab/exercises/:slug` | enunciado + starter | e2e | DONE |
| BTN_LAB_SAVE | `/lab/[slug]` | LabClient | Gravar | click | `PUT /api/lab/exercises/:slug/files` | ficheiros persistidos | e2e | DONE |
| BTN_LAB_RUN | `/lab/[slug]` | LabClient | Correr testes | click | `POST /api/lab/exercises/:slug/runs` | stdout/stderr do contentor | e2e | DONE |
| BTN_NAV_PORTFOLIO | header | SiteHeader | Abrir portfólio | click → `/portfolio` | `GET /api/portfolio` | evidências reais ou vazio | e2e | DONE |
| BTN_GITHUB_CONNECT | `/portfolio` | PortfolioPage | Ligar GitHub | click → `/api/github/connect` | OAuth GitHub | redirect; **ausente** se BLOCKED | e2e | DONE |
| BTN_GITHUB_DISCONNECT | `/portfolio` | GithubDisconnectButton | Desligar GitHub | click | `DELETE /api/github` | linha apagada | — | DONE |
| BTN_GITHUB_PUBLISH | `/portfolio` | GithubPublishButton | Publicar evidência | click | `POST /api/github/publish-evidence` | repo público + Markdown; **ausente** se BLOCKED | integration | DONE |
| BTN_PROJECT_SAVE | `/projeto/[slug]` | ProjectClient | Gravar | click | `PUT /api/projects/:slug/files` | ficheiros persistidos | e2e | DONE |
| BTN_PROJECT_RUN | `/projeto/[slug]` | ProjectClient | Correr testes do projeto | click | `POST /api/projects/:slug/runs` | evidência se passou | e2e | DONE |
| BTN_STUDY_TUTOR | `/estudar/[slug]` | StudyPage | Abrir tutor do nó | click → `/tutor/[slug]` | `GET /api/tutor/threads/:nodeSlug` | conversa ou estado BLOCKED | e2e | DONE |
| BTN_TUTOR_ASK | `/tutor/[slug]` | TutorClient | Perguntar ao tutor | submit | `POST /api/tutor/threads/:nodeSlug/messages` | turno + helpLevel; **ausente** se BLOCKED | e2e | DONE |
| BTN_TUTOR_LEVEL | `/tutor/[slug]` | TutorClient | Escolher nível 0–6 | change | — (body `helpLevel`) | prompt ajustado no próximo ask | unit | DONE |
| BTN_TUTOR_LAB_CODE | `/tutor/[slug]` | TutorClient | Incluir código do lab | change | — (body `includeLabCode`) | ficheiros no system prompt | unit | DONE |
| BTN_NAV_CONTA | header | SiteHeader | Abrir conta | click → `/conta` | — | exportar/apagar | e2e | DONE |
| BTN_ACCOUNT_EXPORT | `/conta` | AccountClient | Gerar exportação | click | `GET /api/account/export` | JSON sem segredos | e2e | DONE |
| BTN_ACCOUNT_DELETE | `/conta` | AccountClient | Apagar conta | submit | `DELETE /api/account` | cascade + logout | e2e | DONE |
| BTN_NAV_BIBLIOTECA | header | SiteHeader | Abrir biblioteca | click → `/biblioteca` | `GET /api/library` | recursos curados com licença | e2e | DONE |
| BTN_STUDY_RESOURCES | `/estudar/[slug]` | StudyPage | Recursos do nó | click → `/biblioteca?node=[slug]` | `GET /api/library?node=` | lista filtrada | e2e | DONE |
| BTN_LIBRARY_ALL | `/biblioteca?node=` | LibraryPage | Ver todos os recursos | click → `/biblioteca` | `GET /api/library` | lista completa | e2e | DONE |
| BTN_NAV_AGENDA | header, `/app` | SiteHeader / AppHomePage | Abrir agenda | click → `/agenda` | `GET /api/calendar` | sessões + revisões FSRS | e2e | DONE |
| BTN_AGENDA_CREATE | `/agenda` | AgendaClient | Agendar sessão | submit | `POST /api/calendar/events` | evento persistido | e2e | DONE |
| BTN_AGENDA_PLAN | `/agenda` | AgendaClient | Planear semana | click | `POST /api/calendar/plan-week` | N sessões pelas horas reais | e2e | DONE |
| BTN_AGENDA_FOCUS | `/agenda` | AgendaClient | Iniciar foco | click | — (timer local) | Pomodoro na página | e2e | DONE |
| BTN_AGENDA_COMPLETE | `/agenda` | AgendaClient | Concluir sessão | click | `POST /api/calendar/events/:id/complete` | status completed + focusedMinutes | e2e | DONE |
| BTN_AGENDA_CANCEL | `/agenda` | AgendaClient | Cancelar sessão | click | `DELETE /api/calendar/events/:id` | status cancelled | integration | DONE |
