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

