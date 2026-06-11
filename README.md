# 🚀 Sevilha Performance SaaS

Bem-vindo ao repositório do **Sevilha Performance**, uma plataforma inovadora de Software as a Service (SaaS) desenhada para revolucionar a gestão de escritórios de contabilidade e consultoria.

## 🎯 O que é o projeto?

O Sevilha Performance é a ponte entre a operação diária e a visão estratégica. Ele permite que consultores e líderes administrem ciclos de gestão, acompanhem entregas de alto valor, estruturem frentes de trabalho e visualizem indicadores cruciais (MRR, Churn, NPS, etc) em um dashboard *Ultra-Premium* focado em usabilidade e design.

### 🌟 Principais Funcionalidades

- **🏛️ Arquitetura Multi-Tenant Segura:** Cada escritório (tenant) roda de forma isolada, garantindo privacidade absoluta e segurança dos dados dos clientes.
- **👁️ Controle de Visões (Roles):** Permissões personalizadas (SuperAdmin, Líder, Consultor), onde cada membro da equipe vê apenas o que importa para a sua operação.
- **📊 Dashboards Analíticos:** Acompanhamento em tempo real das margens, faturamento recorrente (MRR), inadimplência e evolução de metas.
- **📂 Gestão de Entregas 360º:** Fluxos simplificados com *slide-overs* detalhados para organizar anexos, checklists e históricos operacionais de clientes.
- **🎨 UI/UX Premium (Glassmorphism):** Interface fluida, moderna e sofisticada utilizando as melhores práticas do design contemporâneo para encantar o usuário final.

---

## 🛠️ Stack Tecnológico

**Frontend:**
- [Next.js (App Router)](https://nextjs.org/)
- [React](https://reactjs.org/) + [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/) (Micro-interações e animações visuais)
- [Lucide Icons](https://lucide.dev/)

**Backend:**
- [NestJS](https://nestjs.com/) (Framework robusto de Node.js)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL (Banco de Dados)
- Autenticação e Banco Serverless via [Supabase](https://supabase.com/)

---

## 🚀 Como iniciar o ambiente local

Temos um facilitador para rodar ambos os serviços (se estiver no Windows). Basta executar o arquivo na raiz:
```bash
./start_servers.bat
```

Ou, se preferir rodar manualmente:

### 1. Pré-requisitos
- Node.js (v18+)
- PostgreSQL (ou conexão via Supabase local/nuvem)

### 2. Subindo o Backend (API)
```bash
cd backend
npm install
# Configure seu arquivo .env com a string do banco
npx prisma db push
npm run start:dev
```

### 3. Subindo o Frontend (Next.js)
Abra um novo terminal e navegue:
```bash
cd frontend
npm install
# Configure seu arquivo .env.local com as chaves do Supabase Auth
npm run dev
```

Pronto! A interface estará brilhando em `http://localhost:3000`.

---
*Construído com extrema dedicação e foco na melhor experiência possível.* ✨
