import { z } from 'zod';
import { 
  sanitizeEmail, 
  sanitizeHtml, 
  sanitizeDescription, 
  sanitizeCategoryName,
  sanitizeColorHex,
  sanitizeNotes,
  sanitizeTags 
} from './sanitization';

// Auth Schemas
export const RegisterSchema = z.object({
  email: z.string().email('Email inválido').transform(sanitizeEmail),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255).transform(sanitizeHtml),
});

export const LoginSchema = z.object({
  email: z.string().email('Email inválido').transform(sanitizeEmail),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Transaction Schemas
export const TransactionSchema = z.object({
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense', 'transfer'], {
    required_error: 'Tipo de transação é obrigatório',
  }),
  description: z.string().min(1, 'Descrição é obrigatória').max(500).transform(sanitizeDescription),
  transactionDate: z.string().datetime(),
  categoryId: z.string().uuid().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  tags: z.array(z.string()).optional().transform(arr => arr ? sanitizeTags(arr) : []),
  notes: z.string().max(1000).optional().transform(str => str ? sanitizeNotes(str) : undefined),
});

export const UpdateTransactionSchema = TransactionSchema.partial().extend({
  id: z.string().uuid(),
});

// Account Schemas
export const AccountSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(255).transform(sanitizeHtml),
  accountType: z.enum(['checking', 'savings', 'investment', 'credit_card', 'other'], {
    required_error: 'Tipo de conta é obrigatório',
  }),
  balance: z.number(),
  currency: z.string().length(3, 'Moeda deve ter 3 caracteres (ex: BRL)').default('BRL'),
  bankName: z.string().max(255).optional().transform(str => str ? sanitizeHtml(str) : undefined),
  bankCode: z.string().max(50).optional().transform(str => str ? sanitizeHtml(str) : undefined),
  accountNumber: z.string().max(50).optional().transform(str => str ? sanitizeHtml(str) : undefined),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().transform(str => str ? sanitizeColorHex(str) : undefined),
});

export const UpdateAccountSchema = AccountSchema.partial().extend({
  id: z.string().uuid(),
});

// Category Schemas
export const CategorySchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(100).transform(sanitizeCategoryName),
  type: z.enum(['income', 'expense'], {
    required_error: 'Tipo de categoria é obrigatório',
  }),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').transform(sanitizeColorHex),
  icon: z.string().min(1, 'Ícone é obrigatório').max(50).transform(sanitizeHtml),
  parentId: z.string().uuid().optional(),
});

// Budget Schemas
export const BudgetSchema = z.object({
  userId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(255).transform(sanitizeHtml),
  amount: z.number().positive('Valor deve ser positivo'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    required_error: 'Período é obrigatório',
  }),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  alertThreshold: z.number().min(0).max(100).default(80),
});

export const UpdateBudgetSchema = BudgetSchema.partial().extend({
  id: z.string().uuid(),
});

// Goal Schemas
export const GoalSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório').max(255).transform(sanitizeHtml),
  targetAmount: z.number().positive('Valor deve ser positivo'),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().datetime().optional(),
});

export const UpdateGoalSchema = GoalSchema.partial().extend({
  id: z.string().uuid(),
});

// Open Finance Schemas
export const OpenFinanceConnectionSchema = z.object({
  userId: z.string().uuid(),
  bankCode: z.string().min(1).max(50),
  bankName: z.string().min(1).max(255),
  consentId: z.string().optional(),
  status: z.enum(['pending', 'active', 'expired', 'revoked']).default('pending'),
});

// Filter Schemas
export const TransactionFilterSchema = z.object({
  type: z.enum(['all', 'income', 'expense', 'transfer']).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type AccountInput = z.infer<typeof AccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type BudgetInput = z.infer<typeof BudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type GoalInput = z.infer<typeof GoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;
