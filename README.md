# 🛠️ TecOS - Sistema de Gestão para Assistências Técnicas

**[CONFIDENCIAL - PROJETO PRIVADO]**
_Este repositório contém código-fonte proprietário. É estritamente proibida a cópia, distribuição, engenharia reversa ou uso comercial sem autorização expressa._

O **TecOS** é o núcleo (SaaS Multi-Tenant) projetado para gerenciar operações, estoques e faturamento de assistências técnicas. Toda a infraestrutura foi desenhada visando alta disponibilidade, segurança de dados em nuvem e automação de cobranças.

---

## ✨ Arquitetura e Negócios (Internal Overview)

- **🏢 Isolamento de Inquilinos (Multi-Tenant):** Toda a segurança de dados é feita nativamente no PostgreSQL via **RLS (Row Level Security)**. O sistema impede vazamento de clientes, orçamentos e estoque entre lojas diferentes.
- **👥 Controle de Permissões (RBAC):**
  - _SuperAdmin:_ Dashboard global da plataforma SaaS para controle das franquias/lojas.
  - _Gerente:_ Dono da loja contratante (acesso irrestrito aos módulos e relatórios de sua loja).
  - _Atendente:_ Foco em Caixa, Clientes, Agendamentos e controle da recepção.
  - _Técnico:_ Limitado ao pátio: aponta problemas técnicos, consome estoque via laudos (sem acesso a financeiro).
- **💳 Automação de Assinaturas (Billing):** Webhooks nativos integrados. Clientes (Lojas) inadimplentes recebem bloqueio instantâneo do painel, garantindo zero inadimplência tolerada pelo SaaS.
- **🔄 Recuperação de Desastres:** O core do sistema possui ferramentas isoladas no SuperAdmin para despejo (dump) estruturado da operação em JSON e recursos de _Wipe/Factory Reset_ para limpezas de ambiente seguro.

---

## 💻 Tech Stack Oficial

**Frontend (Client):**

- Vue 3 (Composition API) + Vite (Brotli Compression)
- Pinia (Gerenciamento de Estado Reativo)
- Tailwind CSS + shadcn-vue (Design System)

**Backend & Cloud:**

- Supabase (BaaS)
- PostgreSQL (Controle de Triggers e Views dinâmicas)
- Edge Functions (Deno) para Webhooks (Asaas)

---

## 🔒 Diretrizes de Desenvolvimento (Team)

### Deploy em Produção

- O deploy é realizado via CI/CD automático conectado à branch `main`.
- O build gera uma arquitetura de Site Estático (SPA). O _publish directory_ é a pasta `dist`.
- **Atenção no servidor de origem (Render/Vercel):** É obrigatório que a regra de _Rewrite_ de todas as rotas `/*` aponte para `/index.html` para que o Vue Router assuma o controle (evitando erro 404).

### Segurança e Environment

- Variáveis de ambiente (`.env`) jamais devem ser commitadas.
- Todas as regras lógicas de restrição devem obrigatoriamente existir no **banco de dados (Policies/Triggers)**. A interface (Vue) atua apenas na ocultação estética, mas o back-end rejeitará qualquer requisição cruzada por padrão.
