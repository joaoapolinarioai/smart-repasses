# Projeto: Smart Repasses - Marketplace & Rede Social B2B

Plataforma premium para revenda de veículos entre lojistas, com sistema de reserva atômica, propostas de troca e rede social integrada.

## 📋 Visão Geral
Construir um ecossistema fechado (Invite-only) onde lojistas podem negociar veículos com agilidade. O sistema foca em performance (Vite/React), design premium (Shadcn/Tailwind) e consistência de dados (Supabase/Postgres).

- **Tipo de Projeto:** WEB (SPA)
- **Status:** Planejamento

---

## 🚀 Critérios de Sucesso
1.  **Segurança:** Apenas usuários na whitelist podem se cadastrar/logar.
2.  **Concorrência:** Sistema de reserva de 1h impede múltiplos "Compre Já" simultâneos.
3.  **Flexibilidade:** Propostas aceitam dinheiro e/ou carros (estoque ou cadastro rápido).
4.  **Engajamento:** Chat em tempo real vinculado a negociações específicas.
5.  **Design:** Interface fluida, moderna e responsiva seguindo a paleta Emerald/Zinc.

---

## 🛠️ Stack Tecnológica
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Shadcn/UI, Lucide Icons.
- **Backend/DB:** Supabase (Auth, Postgres, Realtime, Storage).
- **Gerenciamento de Estado:** Zustand (Global), TanStack Query (Server State).
- **Roteamento:** React Router DOM v6.

---

## 📂 Estrutura de Diretórios (Feature-Based)
```text
src/
  ├── features/
  │   ├── auth/         # Login, Whitelist check
  │   ├── marketplace/  # Feed, Cards, Busca
  │   ├── negotiation/  # Propostas, Seleção de troca (Quick Add)
  │   ├── inventory/    # Gestão de estoque (Meus Carros)
  │   ├── social/       # Rede de lojistas, Perfis, Reputation
  │   └── chat/         # Mensagens, Realtime
  ├── components/       # Shadcn UI (Componentes base)
  ├── lib/              # Supabase client, utils (formatters, etc)
  ├── store/            # Zustand stores
  ├── hooks/            # Custom hooks
  └── layouts/          # DashboardLayout, AuthLayout
```

---

## 📝 Cronograma de Tarefas

### Fase 1: Fundação & Banco de Dados (P0)
**Agente:** `database-architect` / `backend-specialist`

| ID | Tarefa | Detalhes (INPUT → OUTPUT → VERIFY) |
|----|--------|------------------------------------|
| 1.1 | Schema Whitelist | **In:** Lista de e-mails/CNPJs → **Out:** Tabela `whitelist_users` + Trigger Auth → **Ver:** Tentativa de cadastro de e-mail não listado deve falhar. |
| 1.2 | Schema Veículos | **In:** Requisitos de campos (marca, modelo, fipe) → **Out:** Tabela `vehicles` com RLS → **Ver:** `select` via Supabase Dashboard. |
| 1.3 | Lógica de Reserva (RPC) | **In:** `vehicle_id`, `user_id` → **Out:** Função SQL atômica com `locked_until` (now + 1h) → **Ver:** Executar RPC concorrente via terminal; apenas um deve retornar `true`. |
| 1.4 | Schema Propostas | **In:** Modelo Financeiro vs Troca → **Out:** Tabelas `proposals` e `quick_add_vehicles` → **Ver:** Inserção de proposta híbrida no DB. |

### Fase 2: UI Kit & Autenticação (P1)
**Agente:** `frontend-specialist`

| ID | Tarefa | Detalhes (INPUT → OUTPUT → VERIFY) |
|----|--------|------------------------------------|
| 2.1 | Configuração Inicial | **In:** Vite + Tailwind + Shadcn → **Out:** Estrutura base rodando → **Ver:** `npm run dev` abre página em branco sem erros. |
| 2.2 | Auth Flow (Whitelist) | **In:** UI de Login + Hook Supabase → **Out:** Tela de entrada com validação → **Ver:** Login bem-sucedido redireciona para `/feed`. |
| 2.3 | Layout Dashboard | **In:** Sidebar Fixa + Topbar Flutuante → **Out:** Componente `DashboardLayout` → **Ver:** Responsividade no mobile (sidebar vira menu burguer). |

### Fase 3: Marketplace & Feed (P1)
**Agente:** `frontend-specialist`

| ID | Tarefa | Detalhes (INPUT → OUTPUT → VERIFY) |
|----|--------|------------------------------------|
| 3.1 | Card de Veículo | **In:** Mock data → **Out:** Componente Card com Badges e Preço → **Ver:** Visual premium fiel ao design Emerald. |
| 3.2 | Feed em Tempo Real | **In:** TanStack Query + Supabase Realtime → **Out:** Lista de carros sincronizada → **Ver:** Alterar status de um carro no DB reflete no browser sem refresh. |
| 3.3 | Botão "Reservar Agora" | **In:** Chamada RPC da Fase 1.3 → **Out:** Feedback visual de reserva com Timer → **Ver:** Botão fica desabilitado para outros após clique. |

### Fase 4: Negociação & Trocas (P2)
**Agente:** `frontend-specialist` / `backend-specialist`

| ID | Tarefa | Detalhes (INPUT → OUTPUT → VERIFY) |
|----|--------|------------------------------------|
| 4.1 | Modal de Proposta | **In:** Dialog Shadcn → **Out:** Form com abas "Cash" / "Troca" → **Ver:** Submissão dispara toast de sucesso. |
| 4.2 | Selector de Troca | **In:** Inventory + Quick Add Form → **Out:** UI para escolher carro da loja ou cadastrar um novo rápido → **Ver:** Dados persistidos na tabela `quick_add_vehicles`. |
| 4.3 | Chat de Negociação | **In:** `deal_id` context → **Out:** Janela de chat com Card de resumo do carro no topo → **Ver:** Mensagens enviadas aparecem instantaneamente para ambos. |

---

## 🧪 Fase X: Verificação Final
- [ ] **Segurança:** Rodar `security_scan.py` para verificar RLS e Secrets.
- [ ] **Lógica:** Testar concorrência da reserva (Race condition test).
- [ ] **UX:** Audit via `ux_audit.py` (Foco nos fluxos de proposta).
- [ ] **Performance:** Lighthouse score > 90 para a SPA.
- [ ] **Build:** `npm run build` sem erros de tipos.

## ✅ PRÓXIMOS PASSOS
1. Inicializar projeto Vite.
2. Configurar Supabase CLI e Migrations iniciais (Whitelist + Schema).
3. Desenvolver UI base.
