## Fase 3 — Parc Labs: conta única do dentista, cadastros públicos, assinatura e logo

Vou executar em passos, mostrando o resultado ao final de cada um e aguardando sua confirmação antes de seguir para o próximo. Todos os passos preservam o visual atual (cores, tipografia, cards, sombras, logo Parc Labs).

---

### Passo 1 — Estrutura de dados (migração única)

Migration Supabase criando/alterando:

- **`dentist_lab_links`** (id, dentist_id, lab_id, criado_em, UNIQUE(dentist_id, lab_id)) + GRANTs + RLS.
- **`dentists`**: adicionar `cro TEXT`, `uf TEXT`, `revisao_status TEXT DEFAULT 'pendente'` (check: pendente/confirmado/cancelado).
- **`labs`**: adicionar `visivel_diretorio BOOLEAN DEFAULT true`, `revisao_status TEXT DEFAULT 'pendente'`, `assinatura_status TEXT DEFAULT 'nao_iniciada'`, `logo_url TEXT`, `asaas_subscription_id TEXT`, `asaas_customer_id TEXT`.
- **Migração de dados**: para cada `dentists.lab_id` existente, criar linha em `dentist_lab_links`; marcar labs/dentistas existentes como `revisao_status = 'confirmado'` e labs existentes como `assinatura_status = 'ativa'` para não bloquear operação.
- **RLS revista**: dentistas veem `orders`/`products`/`labs` via `dentist_lab_links` (não mais via `dentists.lab_id` direto); labs/dentistas com `revisao_status = 'cancelado'` bloqueados de escrita.
- **Storage bucket** `lab-logos` (público) via tool.

### Passo 2 — Cadastro público do dentista + acesso direto

- Rota pública `/cadastro-dentista`: form (nome, email, senha, CRO, UF via select dos 27 estados). `supabase.auth.signUp` + insert em `dentists` + `user_roles('dentist')`.
- Rota autenticada `/dentista/laboratorios` (diretório): lista labs com `visivel_diretorio=true AND revisao_status<>'cancelado' AND assinatura_status='ativa'`. Botão "Solicitar acesso" → insert em `dentist_lab_links` (se já existe: mostra "Já vinculado"). Acesso imediato.
- Tela "Meus laboratórios" (cards por lab vinculado). Se só 1 vínculo, redireciona direto.
- Ajustar `useCurrentRole`/roteamento pós-login do dentista.

### Passo 3 — Fila de revisão no admin

- Nova rota `/admin/revisoes` no layout admin, com duas seções: labs pendentes / dentistas pendentes. Botões Confirmar / Cancelar (server fn com `has_role('admin')`).
- Server route agendada `/api/public/hooks/auto-cancel-review` + `pg_cron` diário: cancela pendentes > 10 dias.

### Passo 4 — Cadastro público do laboratório + assinatura Asaas

- Rota pública `/cadastro-laboratorio` em 2 etapas:
  1. Dados: nome, subdomínio (validação de unicidade em tempo real), responsável, email, senha, modo de recebimento (mesmo texto explicativo já usado).
  2. Cartão: número, validade, CVV, titular, CPF/CNPJ, CEP (campos exigidos pelo Asaas para tokenização de cartão).
- Server fn `createLabSubscription`: cria customer Asaas (conta Parc Labs), cria `POST /v3/subscriptions` `MONTHLY` R$ 199, `billingType=CREDIT_CARD`, com `creditCard`+`creditCardHolderInfo` no payload (sem split). Se falhar → retorna erro, não cria lab. Se ok → cria lab (`assinatura_status='ativa'`, `revisao_status='pendente'`), user, `user_roles('lab')`, `lab_members`, salva `asaas_subscription_id`/`asaas_customer_id`; redireciona para `/lab/configuracoes`.
- Constante `PARCLABS_MENSALIDADE = 199` no server.

### Passo 5 — Toggle visibilidade no diretório

- Em `/lab/configuracoes`: switch "Aparecer no diretório público de laboratórios" ligado a `labs.visivel_diretorio`.

### Passo 6 — Upload de logo

- Em `/lab/configuracoes`: input de arquivo. Validações client-side: MIME `image/png` e tamanho ≤ 2MB, mensagens claras. Upload para bucket `lab-logos` path `${labId}.png` (upsert), salva `logo_url` público.
- Texto de apoio recomendando PNG transparente.
- Componente `LabLogo` reutilizável: renderiza `<img>` se `logo_url`, senão fallback com iniciais (círculo atual). Aplicar em: topbar `/lab`, tela login/preview MyParcLab, diretório público, hero da loja.

---

### Detalhes técnicos

- Cadastros públicos usam server functions sem `requireSupabaseAuth` (endpoint público) que fazem: validação Zod → `supabaseAdmin.auth.admin.createUser` (email confirmado) → inserts. Isso evita depender de confirmação de email para o fluxo.
- Chamadas Asaas via `fetch` direto para `https://sandbox.asaas.com/api/v3`, usando `ASAAS_API_KEY` já configurado. Erros do Asaas propagados com mensagem legível (padrão já em `payments.functions.ts`).
- Cron via `supabase--insert` após deploy da rota, usando URL estável `project--9bd4e01e-...-dev.lovable.app` + `apikey` anon.
- Todas tabelas novas seguem GRANT → RLS → POLICIES na mesma migração.
- Sem quebrar visual: reuso de `bg-surface-*`, `border-border`, `rounded-2xl`, `shadow-[var(--shadow-soft)]`, `ParcLabsLogo`.

Confirma que posso começar pelo **Passo 1 (migração de dados)**?
