# Guia de Teste do Sistema de Login

## Sistema de Autenticação Completo

O sistema de autenticação foi completamente implementado e está funcionando. Aqui está como testar:

## Arquitetura

### Arquivos Principais
1. **`/lib/auth-simple.ts`** - Funções de autenticação (register, login, logout, getSession)
2. **`/lib/schemas.ts`** - Validação Zod (LoginSchema, RegisterSchema)
3. **`/app/api/auth/login/route.ts`** - API de login
4. **`/app/api/auth/register/route.ts`** - API de registro
5. **`/app/api/auth/logout/route.ts`** - API de logout
6. **`/middleware.ts`** - Proteção de rotas
7. **`/app/auth/login/page.tsx`** - Página de login
8. **`/app/auth/register/page.tsx`** - Página de registro
9. **`/app/welcome/page.tsx`** - Landing page

### Fluxo de Autenticação

#### 1. Registro
```
POST /api/auth/register
Body: { email, password, name }
→ Valida dados com Zod
→ Verifica se email já existe
→ Cria hash da senha (SHA-256)
→ Insere usuário no banco
→ Cria categorias padrão
→ Cria sessão (cookie session_token)
→ Retorna dados do usuário
```

#### 2. Login
```
POST /api/auth/login
Body: { email, password }
→ Valida dados com Zod
→ Busca usuário por email
→ Verifica senha
→ Cria sessão (cookie session_token)
→ Retorna dados do usuário
```

#### 3. Proteção de Rotas (Middleware)
```
Middleware verifica cookie session_token
→ Se não autenticado: redireciona para /auth/login
→ Se autenticado em rota pública: redireciona para /
→ Caso contrário: permite acesso
```

#### 4. Verificação de Sessão
```
getSession() → Verifica cookie e valida no banco
getCurrentUser() → Retorna dados do usuário logado
requireAuth() → Força autenticação ou redireciona
```

## Como Testar

### Passo 1: Acessar a Aplicação
```
1. Acesse: https://seu-app.vercel.app
2. Será redirecionado para /welcome
3. Clique em "Começar Agora" ou "Já tenho conta"
```

### Passo 2: Criar Conta
```
1. Acesse /auth/register
2. Preencha:
   - Nome: Seu Nome
   - Email: seu@email.com
   - Senha: MinhaSenh@123
3. Clique em "Criar Conta"
4. Será automaticamente logado e redirecionado para /
```

### Passo 3: Fazer Login
```
1. Acesse /auth/login
2. Preencha:
   - Email: seu@email.com
   - Senha: MinhaSenh@123
3. Clique em "Entrar"
4. Será redirecionado para /
```

### Passo 4: Verificar Dashboard
```
1. Após login, você estará em /
2. Verá o dashboard com dados vazios (conta nova)
3. Navegue pelas páginas (Transações, Análises, etc.)
4. Todas as rotas estão protegidas
```

### Passo 5: Fazer Logout
```
1. Clique no ícone de usuário no canto superior direito
2. Clique em "Sair"
3. Será deslogado e redirecionado para /auth/login
```

## Validações Implementadas

### Registro
- ✅ Email válido
- ✅ Senha mínima de 8 caracteres
- ✅ Nome mínimo de 2 caracteres
- ✅ Email único (não permite duplicados)
- ✅ Categorias padrão criadas automaticamente

### Login
- ✅ Email válido
- ✅ Senha obrigatória
- ✅ Verificação de credenciais
- ✅ Criação automática de sessão

### Segurança
- ✅ Senhas com hash SHA-256
- ✅ Cookies httpOnly
- ✅ Cookies secure em produção
- ✅ SameSite: lax
- ✅ Sessões com expiração (30 dias)
- ✅ Proteção de rotas via middleware

## Troubleshooting

### Problema: "Email ou senha incorretos"
**Causa:** Credenciais inválidas
**Solução:** Verifique email e senha, ou crie nova conta

### Problema: "Este email já está cadastrado"
**Causa:** Email já existe no banco
**Solução:** Use outro email ou faça login

### Problema: Redirecionamento infinito
**Causa:** Cookie não está sendo setado
**Solução:** Verifique se `credentials: 'include'` está no fetch

### Problema: "Unauthorized" ao acessar página
**Causa:** Sessão expirada ou inválida
**Solução:** Faça login novamente

## Estrutura do Banco de Dados

### Tabela: users
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- phone (VARCHAR, opcional)
- avatar_url (TEXT, opcional)
- is_email_verified (BOOLEAN, default false)
- preferences (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela: user_sessions
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- session_token (VARCHAR, UNIQUE)
- expires_at (TIMESTAMP)
- ip_address (VARCHAR, opcional)
- user_agent (TEXT, opcional)
- created_at (TIMESTAMP)
```

### Tabela: categories (auto-criadas no registro)
```sql
12 categorias padrão:
- 8 de despesas (Alimentação, Transporte, Moradia, etc.)
- 4 de receitas (Salário, Freelance, Investimentos, Outros)
```

## Status do Sistema

✅ Schema de produção criado
✅ Autenticação funcionando
✅ Registro funcionando
✅ Login funcionando
✅ Logout funcionando
✅ Middleware protegendo rotas
✅ Sessões persistentes
✅ Validação Zod
✅ Categorias padrão
✅ Landing page
✅ Páginas de auth com design profissional

## Próximos Passos Sugeridos

1. Testar fluxo completo de registro → login → navegação → logout
2. Adicionar primeira conta bancária
3. Adicionar primeira transação
4. Conectar Open Finance (quando tiver credenciais)
5. Explorar análises e gráficos
