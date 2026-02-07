# Configuração de Features Avançadas

Este guia explica como configurar todas as 18 novas features implementadas.

## 📦 Dependências Instaladas

✅ `jspdf` - Geração de PDFs
✅ `jspdf-autotable` - Tabelas em PDFs
✅ `nodemailer` - Envio de emails
✅ `web-push` - Push notifications
✅ `@types/nodemailer` - TypeScript types
✅ `@types/web-push` - TypeScript types

## 🗄️ Configuração do Banco de Dados

### 1. Executar Migration

Execute o script SQL para criar todas as tabelas necessárias:

```bash
# Se estiver usando conexão direta
psql $DATABASE_URL -f scripts/migrations/007_advanced_features.sql

# OU copie o conteúdo do arquivo e execute no console do Neon.tech
```

### Tabelas Criadas:

- `transaction_receipts` - Comprovantes de transações
- `notifications` - Notificações in-app
- `push_subscriptions` - Inscrições de push notifications
- `saved_reports` - Relatórios salvos pelo usuário
- `dashboard_layouts` - Layouts personalizados do dashboard
- `notification_preferences` - Preferências de notificações
- `recurring_transactions` - Templates de transações recorrentes
- `audit_logs` - Log de auditoria

## ⚙️ Variáveis de Ambiente

### 1. Email (SMTP)

Para Gmail, você precisa gerar uma senha de app:

1. Acesse https://myaccount.google.com/apppasswords
2. Crie uma nova senha de app
3. Configure no `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app
SMTP_FROM=noreply@seudominio.com
```

### 2. Push Notifications (VAPID Keys)

Gere as chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

Adicione ao `.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
```

### 3. WhatsApp (Twilio) - Opcional

1. Crie conta em https://www.twilio.com
2. Obtenha credentials no console
3. Configure:

```env
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Vercel Blob (Upload de Arquivos)

Já deve estar configurado no seu projeto Vercel:

```env
BLOB_READ_WRITE_TOKEN=seu_token
```

### 5. URL da Aplicação

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000  # desenvolvimento
# NEXT_PUBLIC_APP_URL=https://seudominio.com  # produção
```

## 🚀 Iniciar Service Worker (PWA)

Adicione no seu layout principal (`app/layout.tsx`):

```tsx
"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push-notifications";

export default function RootLayout({ children }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      registerServiceWorker();
    }
  }, []);

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

## 📋 Features Implementadas

### ✅ Gerenciamento de Transações

1. **Upload de Comprovantes**
   - API: `POST /api/transactions/[id]/receipts`
   - Componente: `<ReceiptUpload />`
   - Limite: 10MB (JPG, PNG, PDF)

2. **Busca Full-Text**
   - API: `GET /api/transactions/search?q=termo`
   - Busca em: descrição, categoria, notas, tags

3. **Filtros Avançados**
   - API: `POST /api/transactions/advanced-filter`
   - Filtros: data, valor, tipo, categoria, conta, tags, tem recibo

4. **Edição em Massa**
   - API: `PATCH /api/transactions/bulk`
   - Atualiza múltiplas transações de uma vez

5. **Duplicar Transações**
   - API: `POST /api/transactions/[id]/duplicate`
   - Copia transação com opção de nova data

6. **Transações Recorrentes**
   - API: `POST /api/transactions/recurring`
   - Cron: `/api/cron/process-recurring`
   - Frequências: diária, semanal, mensal, anual

7. **Categorização Automática ML**
   - Lib: `lib/auto-categorize.ts`
   - Detecta padrões e sugere categorias

### ✅ Relatórios & Analytics

8. **Exportar PDF/CSV**
   - API: `POST /api/transactions/export`
   - Formatos: PDF, CSV
   - Inclui totalizadores

9. **Comparação Mês a Mês**
   - API: `GET /api/reports/monthly-comparison?months=6`
   - Mostra variação percentual

10. **Projeções de Fluxo de Caixa**
    - API: `GET /api/reports/cash-flow-projections?months=6`
    - Baseado em histórico + recorrentes

11. **Análise de Padrões**
    - API: `GET /api/reports/patterns`
    - 7 tipos de padrões detectados

12. **Relatórios Customizáveis**
    - API: `POST /api/reports/custom`
    - Métricas configuráveis
    - Salvar configurações

13. **Dashboard Drag-Drop**
    - API: `GET/POST /api/dashboard/layout`
    - Widgets personalizáveis

### ✅ Sistema de Notificações

14. **Notificações In-App**
    - API: `GET/POST /api/notifications`
    - Lib: `lib/notifications.ts`
    - 12 templates prontos

15. **Email Notifications**
    - Lib: `lib/email.ts`
    - 7 templates HTML
    - Nodemailer

16. **Push Notifications PWA**
    - Service Worker: `public/service-worker.js`
    - API: `/api/notifications/subscribe`
    - Lib: `lib/push-notifications.ts`

17. **WhatsApp Notifications**
    - Lib: `lib/whatsapp.ts`
    - Suporta Twilio
    - 8 templates

18. **Preferências de Notificações**
    - API: `GET/PUT /api/notifications/preferences`
    - Controle por canal e tipo

## 🧪 Testar Funcionalidades

### 1. Testar Upload de Comprovante

```typescript
// Em qualquer componente
import { ReceiptUpload } from '@/components/transactions/receipt-upload';

<ReceiptUpload
  transactionId="uuid-da-transacao"
  onUploadComplete={() => console.log('Upload completo!')}
/>
```

### 2. Testar Notificação Push

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Cookie: seu_cookie_de_sessao"
```

### 3. Testar Exportação PDF

```bash
curl -X POST http://localhost:3000/api/transactions/export \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf","startDate":"2026-01-01","endDate":"2026-01-31"}' \
  --output relatorio.pdf
```

### 4. Testar Projeções

```bash
curl http://localhost:3000/api/reports/cash-flow-projections?months=6
```

## 📱 PWA - Manifest

Adicione ao `public/manifest.json`:

```json
{
  "name": "Financial Dashboard",
  "short_name": "FinDash",
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
  ],
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3B82F6"
}
```

## 🔧 Troubleshooting

### Erro: "Table does not exist"

Execute a migration SQL novamente.

### Push notifications não funcionam

1. Verifique se HTTPS está habilitado (necessário para Service Workers)
2. Confirme que as VAPID keys foram geradas corretamente
3. Verifique se o Service Worker foi registrado

### Emails não estão sendo enviados

1. Confirme as credenciais SMTP
2. Para Gmail, use senha de app (não a senha normal)
3. Verifique se a porta 587 está aberta

### WhatsApp não funciona

1. Confirme que tem uma conta Twilio ativa
2. Verifique o número WhatsApp do Twilio
3. Teste com números verificados primeiro

## 📚 Documentação das APIs

Todas as APIs estão documentadas inline. Exemplos:

- `app/api/transactions/export/route.ts`
- `app/api/reports/*/route.ts`
- `app/api/notifications/route.ts`

## 🎯 Próximos Passos

1. ✅ Execute a migration SQL
2. ✅ Configure variáveis de ambiente
3. ✅ Gere VAPID keys para push
4. ✅ Configure SMTP para emails
5. 🔄 Implemente componentes UI conforme necessário
6. 🔄 Configure cron jobs no Vercel

## 💡 Dicas de Uso

- Use filtros avançados para relatórios específicos
- Configure transações recorrentes para lançamentos automáticos
- Ative notificações de orçamento para controle financeiro
- Exporte relatórios mensais em PDF
- Use análise de padrões para identificar gastos incomuns

## 🆘 Suporte

Se precisar de ajuda, verifique:

1. Logs do console (`npm run dev`)
2. Logs do banco de dados
3. Network tab do DevTools para APIs
