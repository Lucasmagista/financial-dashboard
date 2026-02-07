# 🚀 Guia de Melhorias e Otimizações

Este documento lista melhorias sugeridas para tornar o FinanceDash ainda mais robusto e profissional.

## 🎯 Prioridade Alta

### 1. Autenticação Robusta
**Problema Atual**: Sistema de autenticação básico com sessões simples.

**Solução Recomendada**: Implementar NextAuth.js (Auth.js)

```bash
npm install next-auth @auth/core
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserByEmail } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserByEmail(credentials.email)
        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!isValid) return null

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 2. Validação de Dados com Zod
**Problema Atual**: Validação manual nas APIs.

**Solução Recomendada**: Usar Zod para schemas tipados

```bash
npm install zod
```

```typescript
// lib/schemas.ts
import { z } from 'zod'

export const TransactionSchema = z.object({
  accountId: z.number().positive(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1).max(500),
  date: z.string().datetime(),
  categoryId: z.number().positive().optional(),
  merchant: z.string().max(255).optional(),
  isRecurring: z.boolean().optional(),
})

export const AccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['checking', 'savings', 'investment', 'credit_card']),
  balance: z.number(),
  currency: z.string().length(3),
  bankName: z.string().max(255).optional(),
})

// Uso em API
import { TransactionSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = TransactionSchema.parse(body) // Lança erro se inválido
    
    // Prosseguir com dados validados...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 })
    }
  }
}
```

### 3. State Management com SWR
**Problema Atual**: Recarrega a página inteira após mudanças.

**Solução Recomendada**: Usar SWR para cache e revalidação

```bash
npm install swr
```

```typescript
// hooks/use-transactions.ts
'use client'

import useSWR from 'swr'
import { Transaction } from '@/lib/db'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTransactions() {
  const { data, error, mutate } = useSWR<Transaction[]>(
    '/api/transactions',
    fetcher,
    {
      refreshInterval: 30000, // Atualiza a cada 30s
      revalidateOnFocus: true,
    }
  )

  return {
    transactions: data,
    isLoading: !error && !data,
    isError: error,
    mutate, // Função para revalidar
  }
}

// Uso no componente
export function TransactionsList() {
  const { transactions, isLoading, mutate } = useTransactions()

  const handleDelete = async (id: number) => {
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
    mutate() // Revalida automaticamente
  }

  if (isLoading) return <div>Carregando...</div>
  
  return <div>{/* Renderizar transações */}</div>
}
```

### 4. Toast Notifications
**Problema Atual**: Usar `alert()` para feedback.

**Solução Recomendada**: Usar toast do shadcn/ui

```typescript
// Já incluído no projeto, usar assim:
import { useToast } from '@/hooks/use-toast'

export function MyComponent() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: "Sucesso!",
      description: "Transação adicionada com sucesso.",
    })
  }

  const handleError = () => {
    toast({
      variant: "destructive",
      title: "Erro",
      description: "Não foi possível adicionar a transação.",
    })
  }
}
```

## 🎨 Melhorias de UX

### 5. Loading States
Adicionar skeleton loaders:

```typescript
// components/skeleton-transaction.tsx
export function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="h-6 w-20 bg-muted animate-pulse rounded" />
    </div>
  )
}

// Uso
{isLoading ? (
  <TransactionSkeleton />
) : (
  <TransactionsList transactions={transactions} />
)}
```

### 6. Infinite Scroll para Transações
```bash
npm install react-intersection-observer
```

```typescript
import { useInView } from 'react-intersection-observer'

export function TransactionsList() {
  const [page, setPage] = useState(1)
  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView) {
      setPage(p => p + 1) // Carregar mais
    }
  }, [inView])

  return (
    <div>
      {transactions.map(t => <TransactionItem key={t.id} transaction={t} />)}
      <div ref={ref} className="py-4">
        {isLoadingMore && <Spinner />}
      </div>
    </div>
  )
}
```

### 7. Filtros Avançados
```typescript
// components/transaction-filters.tsx
export function TransactionFilters() {
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    dateRange: 'month',
    minAmount: '',
    maxAmount: '',
  })

  return (
    <div className="flex gap-3">
      <Select value={filters.type} onValueChange={...}>
        <SelectItem value="all">Todos</SelectItem>
        <SelectItem value="income">Receitas</SelectItem>
        <SelectItem value="expense">Despesas</SelectItem>
      </Select>
      
      <Select value={filters.category} onValueChange={...}>
        <SelectItem value="all">Todas Categorias</SelectItem>
        {categories.map(c => <SelectItem key={c.id}>{c.name}</SelectItem>)}
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <DateRangePicker />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

## 📊 Analytics e Insights

### 8. Previsão de Gastos com IA
```typescript
// lib/ai-predictions.ts
export async function predictNextMonthExpenses(userId: number) {
  const last6Months = await getIncomeVsExpenses(userId, 6)
  
  // Calcular média móvel
  const avgExpenses = last6Months.reduce((sum, m) => 
    sum + Number(m.expenses), 0
  ) / last6Months.length

  // Detectar tendência
  const recentExpenses = Number(last6Months[last6Months.length - 1].expenses)
  const trend = (recentExpenses - avgExpenses) / avgExpenses

  return {
    predicted: avgExpenses * (1 + trend),
    confidence: 0.75,
    trend: trend > 0 ? 'increasing' : 'decreasing'
  }
}
```

### 9. Categorização Automática com IA
```typescript
// lib/auto-categorize.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function categorizTransaction(description: string, merchant?: string) {
  const prompt = `
    Categorize esta transação financeira em uma das seguintes categorias:
    - Alimentação
    - Transporte
    - Moradia
    - Saúde
    - Educação
    - Lazer
    - Outros
    
    Transação: "${description}"${merchant ? ` no ${merchant}` : ''}
    
    Responda apenas com o nome da categoria.
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })

  return response.choices[0].message.content?.trim()
}
```

### 10. Alertas Inteligentes
```typescript
// lib/alerts.ts
export async function checkAlerts(userId: number) {
  const alerts = []

  // Alerta de orçamento
  const budgets = await getBudgetsByUserId(userId)
  for (const budget of budgets) {
    const percentage = (Number(budget.spent) / Number(budget.amount)) * 100
    if (percentage >= 90) {
      alerts.push({
        type: 'budget',
        severity: 'high',
        message: `Você atingiu ${percentage.toFixed(0)}% do orçamento de ${budget.category_name}`,
      })
    }
  }

  // Alerta de gasto incomum
  const avgDaily = await getAverageDailyExpense(userId)
  const todayExpenses = await getTodayExpenses(userId)
  if (todayExpenses > avgDaily * 2) {
    alerts.push({
      type: 'unusual',
      severity: 'medium',
      message: `Seus gastos hoje estão ${((todayExpenses / avgDaily) * 100).toFixed(0)}% acima da média`,
    })
  }

  return alerts
}
```

## 🔒 Segurança

### 11. Rate Limiting
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests por 10 segundos
})

// Uso em API
export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  
  // Prosseguir...
}
```

### 12. Criptografia de Dados Sensíveis
```bash
npm install crypto-js
```

```typescript
// lib/encryption.ts
import CryptoJS from 'crypto-js'

const SECRET_KEY = process.env.ENCRYPTION_SECRET!

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString()
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Usar para access_tokens do Open Finance
const encryptedToken = encrypt(accessToken)
await sql`UPDATE open_finance_connections SET access_token = ${encryptedToken}`
```

## 📱 Mobile e PWA

### 13. Progressive Web App
```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // ... outras configs
})
```

```json
// public/manifest.json
{
  "name": "FinanceDash",
  "short_name": "FinanceDash",
  "description": "Dashboard Financeiro Pessoal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#7c3aed",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🧪 Testes

### 14. Testes E2E com Playwright
```bash
npm install -D @playwright/test
```

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test('deve exibir dashboard com dados', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Dashboard Financeiro')
  await expect(page.locator('[data-testid="total-balance"]')).toBeVisible()
})

test('deve adicionar nova transação', async ({ page }) => {
  await page.goto('/transactions')
  await page.click('text=Nova Transação')
  await page.fill('#amount', '100')
  await page.fill('#description', 'Teste')
  await page.click('button[type=submit]')
  await expect(page.locator('text=Teste')).toBeVisible()
})
```

## 📈 Monitoramento

### 15. Error Tracking com Sentry
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

### 16. Analytics com Posthog
```bash
npm install posthog-js
```

**Implementar analytics (PostHog ou Plausible):**
- Instalar biblioteca de analytics
- Configurar tracking de eventos importantes
- Criar dashboard de métricas de uso
- Rastrear conversões e engajamento de usuários

## 🚀 Performance

### 17. Image Optimization
```typescript
import Image from 'next/image'

// Otimizar automaticamente
<Image 
  src="/logo.png" 
  width={200} 
  height={200} 
  alt="Logo"
  priority // Para imagens above-the-fold
/>
```

### 18. Bundle Analysis
```bash
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // config
})

// Rodar
ANALYZE=true npm run build
```

## 📝 Checklist de Implementação

- [ ] Implementar NextAuth.js
- [ ] Adicionar validação com Zod
- [ ] Migrar para SWR
- [ ] Adicionar toast notifications
- [ ] Criar skeleton loaders
- [ ] Implementar infinite scroll
- [ ] Adicionar filtros avançados
- [ ] Criar previsões de gastos
- [ ] Implementar categorização automática
- [ ] Adicionar alertas inteligentes
- [ ] Implementar rate limiting
- [ ] Adicionar criptografia
- [ ] Transformar em PWA
- [ ] Adicionar testes E2E
- [ ] Configurar Sentry
- [ ] Adicionar analytics
- [ ] Otimizar imagens
- [ ] Analisar bundle size

---

**Nota**: Implemente essas melhorias gradualmente, testando cada uma antes de prosseguir para a próxima.
