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
