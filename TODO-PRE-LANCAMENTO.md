# TODO — Pré-Lançamento (Tarefas Críticas)

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
- **Cor de destaque do laboratório (cor_destaque):** decidir se o laboratório poderá salvar a própria cor de destaque; caso liberada, adicionar validação de formato hexadecimal `#RRGGBB` com restrição `CHECK` no banco antes de autorizar na lista permitida da guarda, prevenindo injeções ou quebra de estilos em páginas públicas.
- **Exibição de contatos na vitrine pública (Decisão de Produto):**
  - A Server Function pública `getPublicLabBySubdomain` expõe os campos `telefone`, `email_contato`, `endereco` e `endereco_numero` cadastrados pelo laboratório para permitir contato direto com os clientes na vitrine.
  - Avaliar se o laboratório deve ter switches individuais no painel de configurações para ocultar telefone ou endereço da página pública caso prefira atendimento exclusivamente digital.
- **Exposição de leitura da tabela labs [CONCLUÍDO]:**
  - Concluída a segregação através da view `public.labs_visiveis` (apenas colunas públicas e apenas laboratórios visíveis ou vinculados), aplicação de `REVOKE ALL ON public.labs FROM anon`, restrição de `SELECT` em `public.labs` para administradores e membros do próprio laboratório, e migração de todas as chamadas do app para Server Functions e view segura. Rollback documentado em `docs/rollback-labs-exposure.sql`.
- **SMTP próprio no Supabase e confirmação de e-mail obrigatória:** o serviço padrão do Supabase possui limite de 2 e-mails por hora e não entrega para usuários fora da equipe do projeto. É obrigatório configurar um provedor SMTP próprio (ex: Resend, Brevo ou SendGrid) e manter `mailer_autoconfirm = false` para operação real com dentistas externos.
- **Recuperação de senha (interface e rota):** hoje não existe botão nem tela de "Esqueci minha senha" em `/auth` ou rotas associadas. Implementar formulário de solicitação e página de definição de nova senha para usuários autenticados via token de recuperação.
- **Proteção contra apropriação indevida de pedidos órfãos por CRO:** a tabela `dentists` não possui restrição de unicidade no par `(cro, uf)` e a função `autoLinkOrphanedOrders` vincula pedidos órfãos imediatamente no cadastro sem confirmação de identidade. Adicionar constraint única ou exigir validação de documento / aprovação do laboratório antes de vincular pedidos órfãos.
- **Termos de Uso, Política de Privacidade e consentimento LGPD:** o formulário de cadastro do dentista não possui checkbox de consentimento nem links para Termos de Uso e Política de Privacidade.
- **Aviso de novo pedido e novo dentista para o laboratório:** adicionar notificação por e-mail, som ou sinal visual em tempo real no painel do laboratório quando um novo pedido for enviado.
- **Substituição de dados falsos nas telas restantes:** além da tela `Clientes.tsx` (já migrada para dados reais do banco), as telas `Configuracoes.tsx` (equipe fictícia), `Financeiro.tsx` (extrato mockado), `MyParcLab.tsx` (paleta estática) e `Painel.tsx` (pedidos recentes e métricas estáticas) ainda importam dados de `src/data/mock.ts` e devem ser conectadas às consultas reais do Supabase.

