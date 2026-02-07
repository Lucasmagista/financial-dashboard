# 🔒 Guia de Segurança - FinanceDash

Este documento descreve todas as implementações de segurança do sistema.

## 📋 Índice

1. [Autenticação e Autorização](#autenticação-e-autorização)
2. [Sanitização de Inputs](#sanitização-de-inputs)
3. [Rate Limiting](#rate-limiting)
4. [Logging Seguro](#logging-seguro)
5. [Proteção de Rotas](#proteção-de-rotas)
6. [Headers de Segurança](#headers-de-segurança)
7. [Best Practices](#best-practices)

---

## 🔐 Autenticação e Autorização

### Middleware de Autenticação

**Arquivo:** `middleware.ts`

O middleware protege automaticamente todas as rotas, exceto as públicas:

```typescript
// Rotas públicas (não requerem autenticação)
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/welcome",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];
```

### Sessões

- **Armazenamento:** Banco de dados (tabela `user_sessions`)
- **Token:** 32 bytes aleatórios (criptograficamente seguros)
- **Expiração:** 30 dias
- **Renovação automática:** Após 50% do tempo de vida (15 dias)
- **Cookie:** HTTP-only, Secure (produção), SameSite: Lax

### Renovação Automática de Sessões

O middleware renova automaticamente sessões antigas:

```typescript
// Sessão renovada após 15 dias de uso
if (sessionAge > renewalThreshold && sessionAge < maxAge) {
  // Renova sessão automaticamente
  response.cookies.set('session_token', newSessionData, { ... });
}
```

---

## 🧹 Sanitização de Inputs

**Arquivo:** `lib/sanitization.ts`

### Funções de Sanitização

| Função                  | Uso                      | Proteção           |
| ----------------------- | ------------------------ | ------------------ |
| `sanitizeHtml()`        | Textos gerais            | XSS                |
| `sanitizeDescription()` | Descrições de transações | XSS, Scripts       |
| `sanitizeEmail()`       | Emails                   | Normalização       |
| `sanitizeSqlString()`   | Strings SQL              | SQL Injection      |
| `sanitizeUrl()`         | URLs                     | XSS via URLs       |
| `sanitizeUuid()`        | IDs                      | Validação UUID     |
| `sanitizeAmount()`      | Valores monetários       | Injection numérica |
| `sanitizeTags()`        | Arrays de tags           | XSS em arrays      |
| `sanitizeForLog()`      | Logs                     | Vazamento de dados |

### Exemplo de Uso

```typescript
import { sanitizeHtml, sanitizeEmail } from "@/lib/sanitization";

// Sanitizar antes de validar
const sanitizedData = {
  email: sanitizeEmail(body.email),
  name: sanitizeHtml(body.name),
};

const validated = Schema.parse(sanitizedData);
```

### Schemas com Sanitização Automática

Todos os schemas Zod incluem sanitização automática via `.transform()`:

```typescript
export const RegisterSchema = z.object({
  email: z.string().email().transform(sanitizeEmail),
  name: z.string().min(2).max(255).transform(sanitizeHtml),
  password: z.string().min(8), // Não sanitizar passwords
});
```

---

## 🚦 Rate Limiting

**Arquivo:** `lib/rate-limit.ts` e `middleware.ts`

### Tiers de Rate Limiting

| Tier     | Limite | Janela | Uso                |
| -------- | ------ | ------ | ------------------ |
| `AUTH`   | 5 req  | 1 min  | Login, registro    |
| `WRITE`  | 20 req | 1 min  | POST, PUT, DELETE  |
| `QUERY`  | 60 req | 1 min  | GET requests       |
| `UPLOAD` | 10 req | 1 min  | Upload de arquivos |
| `API`    | 30 req | 1 min  | APIs gerais        |

### Implementação

#### No Middleware (Automático)

```typescript
// Aplica rate limiting em todas as requisições
if (!checkRateLimit(rateLimitKey, isApi)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

#### Em Rotas Específicas (Manual)

```typescript
import { checkRateLimit, RateLimitTier } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const allowed = await checkRateLimit(userId, RateLimitTier.AUTH);

  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Continuar processamento...
}
```

### Armazenamento

- **Produção:** Redis (Upstash) - distribuído, multi-instância
- **Fallback:** Memória - single-instance, desenvolvimento

---

## 📊 Logging Seguro

**Arquivo:** `lib/logger.ts`

### Níveis de Log

| Nível      | Quando Usar                | Produção         |
| ---------- | -------------------------- | ---------------- |
| `DEBUG`    | Desenvolvimento            | ❌ Não logado    |
| `INFO`     | Eventos normais            | ✅ Logado        |
| `WARN`     | Avisos, problemas menores  | ✅ Logado        |
| `ERROR`    | Erros que precisam atenção | ✅ Logado        |
| `SECURITY` | Eventos de segurança       | ✅ Sempre logado |

### Uso Correto

```typescript
import { logger, logAuthEvent } from "@/lib/logger";

// ✅ CORRETO - Sem dados sensíveis
logger.info("User login successful", { userId: user.id });

// ❌ ERRADO - Expõe senha
console.log("Login attempt:", { email, password }); // NUNCA FAZER ISSO

// ✅ CORRETO - Evento de segurança
logAuthEvent("failed_login", undefined, ipAddress);
```

### Sanitização Automática

O logger sanitiza automaticamente dados sensíveis:

```typescript
const sensitiveKeys = [
  "password",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "session",
];

// Automaticamente substitui por '[REDACTED]'
logger.info("User data", {
  email: "user@example.com",
  password: "secret123", // Será '[REDACTED]'
});
```

### Integração com Serviços Externos

Configure para enviar logs para serviços centralizados:

```env
# .env
LOGGING_ENDPOINT=https://logs.example.com
LOGGING_API_KEY=your_api_key
SENTRY_DSN=https://sentry.io/your-project
```

---

## 🛡️ Proteção de Rotas

### Middleware Automático

Todas as rotas são protegidas automaticamente, exceto as públicas.

**Comportamento:**

- **Páginas não autenticadas:** Redireciona para `/auth/login`
- **APIs não autenticadas:** Retorna `401 Unauthorized`
- **Sessão expirada:** Redireciona com `?reason=session_expired`

### Proteção Manual em Server Components

```typescript
import { requireAuth } from '@/lib/auth-simple';

export default async function ProtectedPage() {
  const user = await requireAuth();
  // Se não autenticado, redireciona automaticamente

  return <div>Olá {user.name}</div>;
}
```

### Proteção em API Routes

```typescript
import { getCurrentUser } from "@/lib/auth-simple";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Continuar...
}
```

---

## 🔒 Headers de Segurança

O middleware adiciona automaticamente headers de segurança:

```typescript
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Content Security Policy (Produção)

```typescript
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.pluggy.ai https://*.neon.tech;
```

---

## ✅ Best Practices

### 1. Nunca Logue Dados Sensíveis

```typescript
// ❌ ERRADO
console.log("User login:", { email, password });
console.log("Session token:", sessionToken);

// ✅ CORRETO
logger.info("User login attempt", { userId });
logger.security("Login successful", { userId, ip });
```

### 2. Sempre Sanitize Inputs

```typescript
// ❌ ERRADO
const result = await sql`
  INSERT INTO transactions (description) 
  VALUES (${body.description})
`;

// ✅ CORRETO
const sanitized = sanitizeDescription(body.description);
const validated = TransactionSchema.parse({ ...body, description: sanitized });
```

### 3. Use Rate Limiting em Operações Sensíveis

```typescript
// Login, registro, reset de senha
const allowed = await checkRateLimit(ip, RateLimitTier.AUTH);

// Uploads de arquivo
const allowed = await checkRateLimit(userId, RateLimitTier.UPLOAD);
```

### 4. Valide UUIDs

```typescript
// ❌ ERRADO
const user = await sql`SELECT * FROM users WHERE id = ${userId}`;

// ✅ CORRETO
const validatedId = sanitizeUuid(userId);
if (!validatedId) {
  return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
}
```

### 5. Use HTTPS em Produção

```env
# Sempre force HTTPS em produção
NODE_ENV=production

# Cookies serão automaticamente Secure
```

### 6. Atualize Dependências Regularmente

```bash
# Verificar vulnerabilidades
npm audit

# Atualizar dependências
npm update

# Usar Dependabot no GitHub
```

### 7. Limite Tamanho de Payloads

```typescript
// Limite tamanho de descrições, notas, etc.
description: z.string().max(500);
notes: z.string().max(1000);
```

---

## 🚨 Checklist de Segurança

- [x] Middleware de autenticação implementado
- [x] Rate limiting em todas as rotas
- [x] Sanitização de todos os inputs
- [x] Logging sem dados sensíveis
- [x] Headers de segurança configurados
- [x] Sessões com renovação automática
- [x] Validação com Zod em todas as APIs
- [x] Proteção contra XSS
- [x] Proteção contra SQL Injection
- [x] CSRF protection via SameSite cookies
- [ ] Implementar 2FA (futuro)
- [ ] Adicionar Sentry para error tracking (futuro)
- [ ] Configurar WAF (Web Application Firewall) (futuro)

---

## 📞 Reportar Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança, NÃO abra uma issue pública.

Entre em contato diretamente através de: security@yourdomain.com

---

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
