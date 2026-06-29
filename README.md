# 🚀 Sevilha Performance SaaS | Sistema de Performance Operacional (TASS)

Bem-vindo ao repositório oficial do **Sevilha Performance**, uma plataforma inovadora e estruturalmente robusta desenhada para revolucionar os projetos de consultoria em **Performance Operacional** para escritórios de contabilidade.

---

## 🎯 O que é o projeto?

O **Sevilha Performance** nasce como a ponte definitiva entre a operação diária das contabilidades e a visão estratégica dos consultores. Mais do que um SaaS genérico, ele evolui para um **Ecossistema Completo TASS (Total Accounting & System Solution)**.

A plataforma substitui o retrabalho manual de planilhas dispersas por uma central de inteligência automatizada. Ela permite que consultores da Sevilha, líderes e gestores administrem carteiras de clientes, acompanhem fluxos de entregas, mensurem tempos operacionais e identifiquem oportunidades de crescimento comercial em tempo real.

---

## 🗺️ A Jornada Estratégica: M0 e M1

O desenvolvimento do sistema segue uma jornada rigorosa alinhada ao método real de consultoria da Sevilha Performance:

### 🔹 M0: Estruturação Inicial da Plataforma
A base fundacional que prepara o ambiente para absorver a operação de múltiplos escritórios e consultores.
- **Hierarquia Multi-Camada:** `Sevilha Performance → Consultores → Escritórios de Contabilidade → Frentes (Fiscal, DP, Contábil) → Clientes → Entregas e Tempos`.
- **Governança:** Vínculo exato entre consultores e escritórios, garantindo isolamento e gestão de permissões avançada (SuperAdmin, Líder, Consultor).

### 🔹 M1: Mapeamento Operacional & Ecossistema TASS
O sistema ganha vida operando como um hub ativo de dados, centralizando o fluxo de trabalho e gerando leituras automáticas para tomada de decisão.
- **Ingestão Padronizada por Templates:** Carga rápida e limpa de arquivos padronizados (carteira, colaboradores, entregas e tempos) sem depender inicialmente de integrações frágeis com softwares terceiros.
- **Leituras Estratégicas:** Identificação imediata de concentração de carteira, gargalos operacionais e sobrecarga por colaborador.

---

## 🌟 Funcionalidades de Alto Valor (Ecossistema TASS)

- **🏛️ Arquitetura Multi-Tenant Segura:** Banco de dados isolado dinamicamente via Prisma ORM para cada escritório (tenant), garantindo privacidade absoluta e escalabilidade para grandes volumes de dados (preparado para absorver um histórico de ~800 GB).
- **⏱️ Gestão de Tempos e Custo Gerencial (Timesheet & DRE):** Widget flutuante com cronômetro em tempo real. O sistema calcula automaticamente o impacto financeiro das horas investidas contra a mensalidade do cliente (`monthlyFee`), utilizando o custo real do colaborador (`grossSalary`).
- **📂 Workflow de Entregas 360º com Conformidade Automática:** Rotinas assíncronas (CRON Jobs) no backend identificam a abertura de ciclos mensais e injetam entregas automaticamente com base no regime tributário do cliente. Tudo gerenciado por painéis *slide-overs 360º* com histórico e checklists.
- **🎯 Hub de Inteligência Comercial (CRM de Oportunidades):** Motor inteligente que rastreia gatilhos na operação (como estouro de horas contratadas ou surto no volume de notas/admissões) e gera cards automáticos de *up-sell* e *cross-sell*.
- **🎨 UI/UX Ultra-Premium (Glassmorphism):** Interface sofisticada, fluida e contemporânea. Desenvolvida sob regras estritas de design: 0% de cores roxas/violetas (*Purple Ban*) e abandono de layouts genéricos (*Template Ban*), utilizando micro-animações suaves para encantar o usuário final.

---

## 🛠️ Stack Tecnológico

**Frontend (UI/UX Premium):**
- **Framework:** [Next.js (App Router)](https://nextjs.org/) + React 19
- **Estilização:** [TailwindCSS v4](https://tailwindcss.com/) (Glassmorphism, `backdrop-blur`, interfaces limpas)
- **Animações:** [Framer Motion](https://www.framer.com/motion/) (Widgets flutuantes e micro-interações)
- **Ícones:** [Lucide Icons](https://lucide.dev/)

**Backend (API & Automação):**
- **Framework:** [NestJS](https://nestjs.com/) (Arquitetura modular robusta + CRON/Schedule Jobs)
- **ORM & Banco:** [Prisma ORM](https://www.prisma.io/) + PostgreSQL (Esquemas dinâmicos multi-tenant)
- **Auth & Serverless:** [Supabase Auth](https://supabase.com/)

---

## 🚀 Como iniciar o ambiente local

Se estiver no Windows, disponibilizamos um facilitador automatizado que sobe ambos os serviços simultaneamente. Na raiz do projeto, execute:

```bash
./start_servers.bat
```

### Inicialização Manual

#### 1. Pré-requisitos
- Node.js (v18+)
- PostgreSQL (ou conexão via Supabase local/nuvem)

#### 2. Subindo o Backend (API / NestJS)
```bash
cd backend
npm install
# Configure seu arquivo .env com a string de conexão do banco
npx prisma db push
npm run start:dev
```

#### 3. Subindo o Frontend (UI / Next.js)
Abra um novo terminal e navegue:
```bash
cd frontend
npm install
# Configure seu arquivo .env.local com as credenciais do Supabase Auth
npm run dev
```

Pronto! A interface estará operando com máxima performance e design de ponta em `http://localhost:3000`.

---
*Construído com excelência técnica, arquitetura de ponta e foco absoluto em performance operacional.* ✨
