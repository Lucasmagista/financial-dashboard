# 💰 FinanceDash - Dashboard Financeiro Pessoal

Um dashboard financeiro completo e profissional desenvolvido com Next.js 16, React 19, PostgreSQL (Neon) e Tailwind CSS. Gerencie suas finanças pessoais de forma inteligente com análises avançadas, gráficos interativos e preparação para integração com Open Finance.

## ✨ Funcionalidades

### 📊 Dashboard Principal
- **Visão Geral Financeira**: Acompanhe seu patrimônio líquido, receitas, despesas e saldo mensal
- **Gráficos Interativos**: Visualize receitas vs despesas nos últimos 6 meses
- **Análise por Categoria**: Veja a distribuição dos seus gastos em gráfico de pizza
- **Transações Recentes**: Lista das últimas movimentações financeiras

### 💳 Gestão de Contas
- **Múltiplas Contas**: Gerencie contas correntes, poupança, investimentos e cartões de crédito
- **Saldos Atualizados**: Visualize o saldo de todas as suas contas em tempo real
- **Conexão Bancária**: Prepare-se para conectar seus bancos via Open Finance

### 📝 Controle de Transações
- **Histórico Completo**: Veja todas as suas transações com filtros e busca
- **Categorização**: Organize gastos e receitas por categorias personalizadas
- **Detalhes Ricos**: Merchant, data, descrição e conta associada

### 📈 Análises Avançadas
- **Métricas Detalhadas**: Taxa de poupança, médias mensais e tendências
- **Insights Inteligentes**: Alertas automáticos sobre gastos e economia
- **Top Categorias**: Identifique onde você mais gasta
- **Histórico de 12 Meses**: Análise temporal completa

### 💰 Orçamentos e Metas
- **Orçamentos por Categoria**: Defina limites de gastos mensais, semanais ou anuais
- **Alertas de Limite**: Notificações quando estiver próximo ou acima do orçamento
- **Metas Financeiras**: Crie objetivos e acompanhe o progresso
- **Visualização de Progresso**: Barras de progresso com percentuais

### 🔗 Open Finance (Estrutura Preparada)
- **Conexão Segura**: Arquitetura pronta para integração com provedores
- **Múltiplos Bancos**: Prepare-se para conectar Nubank, Itaú, Bradesco, Santander e mais
- **Sincronização Automática**: Estrutura para importação automática de transações
- **Gestão de Consentimentos**: Controle de conexões ativas e inativas

## 🛠️ Tecnologias

- **Frontend**: Next.js 16, React 19, TypeScript
- **Estilização**: Tailwind CSS v4, shadcn/ui
- **Banco de Dados**: PostgreSQL (Neon)
- **Gráficos**: Recharts
- **Autenticação**: Sistema customizado com sessões HTTP-only
- **Deploy**: Vercel

## 🚀 Como Usar

### Pré-requisitos

- Node.js 18+ instalado
- Conta Neon (PostgreSQL) configurada
- Variável de ambiente `DATABASE_URL` configurada

### Instalação

1. **Clone o repositório** ou baixe o código

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure o banco de dados**:
   - O script SQL já foi executado e criou todas as tabelas necessárias
   - Tabelas criadas: `users`, `accounts`, `transactions`, `categories`, `budgets`, `goals`, `open_finance_connections`
   - Dados de demonstração já foram inseridos

4. **Execute o projeto**:
```bash
npm run dev
```

5. **Acesse**: http://localhost:3000

## 📁 Estrutura do Projeto

```
/
├── app/
│   ├── page.tsx                    # Dashboard principal
│   ├── transactions/page.tsx       # Gestão de transações
│   ├── analytics/page.tsx          # Análises avançadas
│   ├── open-finance/page.tsx       # Conexão Open Finance
│   ├── api/
│   │   ├── transactions/route.ts   # API de transações
│   │   ├── accounts/route.ts       # API de contas
│   │   ├── categories/route.ts     # API de categorias
│   │   └── open-finance/connect/route.ts
│   ├── layout.tsx                  # Layout com navegação
│   └── globals.css                 # Estilos globais (tema)
├── components/
│   ├── navigation.tsx              # Navegação principal
│   └── dashboard/
│       ├── stat-card.tsx           # Cards de estatísticas
│       ├── income-expense-chart.tsx
│       ├── category-breakdown.tsx
│       ├── recent-transactions.tsx
│       ├── accounts-overview.tsx
│       ├── budgets-overview.tsx
│       └── goals-overview.tsx
├── lib/
│   ├── db.ts                       # Funções do banco de dados
│   ├── auth.ts                     # Sistema de autenticação
│   └── utils-finance.ts            # Utilitários financeiros
└── scripts/
    └── setup-database.sql          # Script de criação do BD
```

## 🎨 Design

O design utiliza um sistema de cores profissional baseado em azul/roxo com:
- Tema claro e escuro automático
- Tipografia Geist (sans e mono)
- Componentes shadcn/ui customizados
- Gráficos interativos com Recharts
- Layout responsivo mobile-first

## 🔒 Segurança

- Senhas hasheadas (pronto para bcrypt em produção)
- Sessões HTTP-only cookies
- Prepared statements (proteção SQL injection)
- Validação de entrada em todas as APIs
- Row Level Security preparado

## 📊 Banco de Dados

### Tabelas Principais

- **users**: Usuários do sistema
- **accounts**: Contas bancárias (corrente, poupança, investimento, cartão)
- **transactions**: Transações financeiras (receitas e despesas)
- **categories**: Categorias customizadas
- **budgets**: Orçamentos por categoria
- **goals**: Metas financeiras
- **open_finance_connections**: Conexões bancárias via Open Finance

## 🔄 Próximos Passos (Sugestões)

### Implementação Open Finance Real
1. Integrar com provedor (Pluggy, Belvo, Bankly)
2. Implementar OAuth flow bancário
3. Sincronização automática de transações
4. Gestão de tokens de acesso

### Funcionalidades Adicionais
- [ ] Exportação de relatórios (PDF/CSV)
- [ ] Alertas e notificações por email
- [ ] Categorização automática com IA
- [ ] Previsão de gastos futuros
- [ ] Multi-usuário e compartilhamento familiar
- [ ] Integração com carteiras digitais
- [ ] Importação manual de extratos (OFX/CSV)
- [ ] Dark mode toggle manual
- [ ] PWA (Progressive Web App)

### Melhorias Técnicas
- [ ] Testes unitários e E2E
- [ ] Cache com Redis
- [ ] Rate limiting nas APIs
- [ ] Logs estruturados
- [ ] Monitoramento de erros (Sentry)
- [ ] CI/CD pipeline
- [ ] Backup automático do BD

## 🤝 Contribuindo

Este é um projeto de demonstração, mas você pode:
1. Fazer fork do repositório
2. Criar uma branch para sua feature
3. Fazer commit das mudanças
4. Enviar um pull request

## 📝 Licença

Este projeto foi criado como demonstração e pode ser usado livremente para fins educacionais e comerciais.

## 🙏 Agradecimentos

Desenvolvido com Next.js, React, PostgreSQL e muito ☕

---

**Nota**: Esta é uma aplicação de demonstração. Para uso em produção, implemente:
- Autenticação robusta (NextAuth.js, Auth.js)
- Criptografia de dados sensíveis
- Compliance com LGPD/GDPR
- Auditoria e logs de segurança
- Integração real com Open Finance certificada pelo Banco Central
