# ⚡ START HERE - Comece Aqui!

## 🚀 Início Rápido (3 passos)

### 1️⃣ Instale as dependências

```bash
pnpm install
```

Ou use `npm install` se preferir.

### 2️⃣ Configure o banco de dados

1. Crie uma conta gratuita em: https://neon.tech
2. Crie um projeto PostgreSQL
3. Copie a **Connection String**
4. Abra `.env.local` e cole sua URL:
   ```env
   DATABASE_URL=sua_url_aqui
   ```
5. Execute o script SQL no Neon Dashboard:
   - Abra `scripts/setup-production-database.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Neon e execute

### 3️⃣ Inicie o projeto

```bash
pnpm dev
```

Acesse: **http://localhost:3000** 🎉

---

## 📚 Guias Detalhados

- 🪟 **Windows?** → Leia [WINDOWS_SETUP.md](WINDOWS_SETUP.md)
- ⚡ **Início Rápido** → Leia [INICIO_RAPIDO.md](INICIO_RAPIDO.md)
- 📖 **Documentação Completa** → Leia [README.md](README.md)
- 🏭 **Produção** → Leia [README_PRODUCTION.md](README_PRODUCTION.md)

---

## ✅ Verificar Configuração

```bash
pnpm check
```

Este comando verifica se tudo está configurado corretamente!

---

## 🎯 O que você criou?

Este é um **Dashboard Financeiro Completo** com:

- ✅ Gestão de contas bancárias
- ✅ Controle de transações
- ✅ Análises e gráficos
- ✅ Orçamentos e metas
- ✅ Integração com Open Finance (opcional)
- ✅ Sistema de autenticação
- ✅ Design responsivo e moderno

---

## 🆘 Problemas?

Execute o comando de verificação:

```bash
pnpm check
```

Ou leia os guias na pasta `docs/`

---

**Feito! Agora é só começar a usar! 🚀**
