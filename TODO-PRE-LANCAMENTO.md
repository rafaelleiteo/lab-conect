# TODO: Pré-Lançamento (Tarefas Críticas)

## 1. Segurança e Resolução de Dependências TanStack (CVE-2026-102989)

- [ ] **Remover flag de bypass de segurança no deploy:**
  - O arquivo `vercel.json` na raiz contém a flag:
    ```json
    "DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS": "1"
    ```
  - **Motivo da flag:** A versão atual do framework é `@tanstack/react-start: 1.168.26`, que possui o aviso de vulnerabilidade CVE-2026-102989 (XSS em serialização SSR). A Vercel bloqueou preventivamente essa versão no download via 403.
  - **Histórico técnico:** Uma tentativa de atualização pontual direta para `@tanstack/react-start: 1.168.60` quebrou o build do Nitro/SSR com 11 erros de símbolos ausentes (`_getRenderedMatches`, `isPromise`, `bindSsrResponseToRequest`, etc.), pois exige a migração sincronizada e coordenada de todo o ecossistema `@tanstack/*` (`@tanstack/react-router`, `@tanstack/router-core`, `@tanstack/router-plugin`, etc.).
  - **Condição obrigatória para entrada em produção:**
    - Esta flag **deve ser removida** antes de qualquer laboratório ou dentista real utilizar o sistema.
    - Esta flag **deve ser removida** antes de reativar a integração com o gateway de pagamentos Asaas.
  - **Plano de ação:**
    - Realizar a migração coordenada de todos os pacotes `@tanstack/*` em uma **branch separada**.
    - Validar o build de SSR e testar exaustivamente na URL de Preview da Vercel antes de mesclar para a `main`.
    - Remover `vercel.json` (ou retirar a flag de bypass) garantindo build limpo sem avisos.

## 2. Remoção de Credenciais de Teste na Tela de Login

- [ ] **Remover bloco "Usuários de Teste" em `/auth`:**
  - O componente `src/routes/auth.tsx` contém um bloco visível exibindo os e-mails e senhas de teste (`admin@labconect.test`, `lab@updigital.test`, `dentista@updigital.test`, senha `123456`).
  - **Condição obrigatória para lançamento:**
    - Remover este bloco visual de `/auth` antes de abrir a plataforma ao público.
    - Trocar as senhas de teste de todas as contas administrativas, laboratórios e dentistas no Supabase.

## 3. Pendências de Pré-Lançamento

- **Domínio:** ainda não comprado (fase de teste). Quando comprar, configurar o domínio raiz e o subdomínio curinga na Vercel, ligar CUSTOM_DOMAIN_ACTIVE em domain-context.ts, atualizar o Site URL e as Redirect URLs de autenticação do Supabase, e só então configurar o remetente dos e-mails.
- **Plano Supabase:** o gratuito limita arquivos a 50 MB e 1 GB no total, e tomografia DICOM não cabe. Decidir a assinatura Pro antes do primeiro laboratório real. Conferir também a política de backups do plano gratuito antes de guardar dado de paciente.
- **Pagamento:** a função de cobrança usa orders.valor (protegido contra alteração). Retestar o fluxo do Asaas com unidades maiores que 1 antes de reativar.
- **Pendências do bloco de pedidos:** baixar todos os arquivos de uma vez; limpeza periódica de rascunhos antigos e de arquivos órfãos no storage; aviso por e-mail ao laboratório quando chegar pedido ou arquivo; mensagens dentro do pedido.
- **Privacidade:** o sistema passou a guardar nome de paciente e arquivos clínicos. Antes de abrir para usuários reais: política de privacidade, termos de uso e consentimento no cadastro.
- **Guarda de colunas na tabela dentists:** a tabela `dentists` possui policy de UPDATE aberta para o próprio usuário sem restrição de coluna, permitindo que um dentista altere seu próprio `revisao_status` via API. Implementar trigger de proteção (`guard_dentists_update`) no mesmo padrão adotado para `labs`.
- **Gestão de membros do laboratório (lab_members):** atualmente apenas administradores da plataforma podem inserir ou remover em `lab_members`. Laboratórios ainda não têm fluxo ou permissão RLS para convidar funcionários ou protéticos para sua própria equipe.
- **Alteração de subdomínio:** o laboratório pode alterar o subdomínio, mas isso quebra links públicos, QR Codes impressos e favoritos já distribuídos a dentistas. Adicionar confirmação com aviso explícito de quebra de links ou bloquear alteração pós-ativação quando o domínio próprio estiver operando.
- **Validação de token do webhook Asaas:** validar o token do webhook do Asaas (`/api/public/asaas-webhook`) conferindo o header `asaas-access-token` antes de reativar o gateway de pagamentos.
- **Contas definitivas e limpeza de usuários de teste:** criar a conta de administrador definitiva com senha forte, apagar as contas de teste (`admin@labconect.test`, `lab@updigital.test`, `dentista@updigital.test`) e remover o bloco "Usuários de Teste" da tela `/auth`, antes de inserir qualquer dado real.
- **Agendamento e segredo da rota auto-cancel-review:**
  - A rota `src/routes/api/public/hooks/auto-cancel-review.ts` foi protegida no código com comparação segura de tempo constante (`crypto.timingSafeEqual`) exigindo `Authorization: Bearer <CRON_SECRET>` e falha fechada se a variável não estiver definida.
  - **Pendente:** Configurar a variável de ambiente `CRON_SECRET` no painel da Vercel (ou Supabase Vault) e configurar o cron job (Vercel Cron ou cron externo) para disparar a rota com o header `Authorization: Bearer <CRON_SECRET>`.
- **Higiene de privilégios de banco:** revogar `TRUNCATE`, `REFERENCES` e `TRIGGER` concedidos indevidamente para `anon` e `authenticated` em todas as tabelas do schema `public` e nos privilégios padrão (`ALTER DEFAULT PRIVILEGES`) de novas tabelas.
- **Cor de destaque do laboratório (cor_destaque) [CONCLUÍDO]:**
  - Implementada constraint CHECK (`labs_cor_destaque_check`) restringindo às 5 cores da paleta oficial (#4C5FF5, #2D6FDB, #28854F, #C23A3A, #9A6710), atualizada a trigger `guard_labs_update` autorizando a coluna, conectado seletor persistente em `MyParcLab.tsx` e refletido na vitrine pública.
- **Aviso de novo pedido no painel do laboratório [CONCLUÍDO]:**
  - Implementado contador dinâmico (badge) ao lado de Pedidos no menu lateral para pedidos recebidos e notificação discreta em tempo real via Supabase Realtime (canal filtrado por lab_id com auto-dismiss), sem som, sem push do navegador e sem envio de e-mails não autorizados.
- **Substituição de dados falsos nas telas restantes [CONCLUÍDO]:**
  - Eliminados todos os mocks de `Painel.tsx`, `Financeiro.tsx`, `Configuracoes.tsx` e `MyParcLab.tsx`. O arquivo `src/data/mock.ts` foi removido definitivamente do repositório. Métricas e extratos agora consultam o banco real com empty states honestos.
- **Jornada do dentista e confirmação de e-mail (A3):**
  - Quando `mailer_autoconfirm = false`, o método `signUp` do Supabase não retorna sessão ativa e a tentativa subsequente de login imediato falha com erro de confirmação pendente. Isso impede a inserção direta do registro na tabela `dentists` pelo cliente via RLS.
  - Solução para produção: armazenar os dados cadastrais (nome, CRO, UF) no `options.data` (user_metadata) durante o `signUp` e criar o registro em `dentists` via trigger de banco no evento `after insert on auth.users`, em conjunto com a ativação de SMTP próprio (Resend/Brevo/SendGrid).
- **Gestão de equipe do laboratório (Configurações):**
  - Implementar módulo de gerenciamento de membros e permissões para que o laboratório possa convidar colaboradores e protéticos diretamente pela tela de Configurações, com políticas de RLS dedicadas em `lab_members`.
- **Conciliação de pagamentos no Financeiro (Asaas):**
  - Reativar a conciliação bancária, comissões da plataforma e extrato detalhado de repasses na tela Financeiro assim que a integração com o gateway Asaas for reativada.
- **Higiene e remoção de contas de teste antes do lançamento:**
  - Remover definitivamente as contas de teste (`@updigital.test`, `@labconect.test` e quaisquer usuários temporários criados nos blocos de teste) antes de convidar usuários externos reais para a plataforma.
- **Envio de e-mail ao laboratório sobre nova reivindicação:**
  - Notificar o laboratório por e-mail quando houver nova reivindicação pendente de pedido órfão, com agrupamento (throttled digest) para evitar múltiplos disparos e respeitar limites de envio do Resend/SMTP.
- **Proteção contra abuso no fluxo de reivindicação por CRO:**
  - Implementar proteção contra abuso (ex.: captcha no cadastro, limite de requisições/reivindicações por IP e hora, e alerta automático ao administrador caso o mesmo CRO seja reivindicado por múltiplos dentistas diferentes).
- **Sobrescrita do site_url pela integração Supabase-Vercel:**
  - A integração nativa Supabase-Vercel pode sobrescrever a configuração de `site_url` do Supabase a cada deploy ou redeploy. Manter monitoramento ou blindagem das Redirect URLs e Site URL oficial (`https://lab-conect.vercel.app`) para evitar regressão para URLs de preview ou domínios legados.


