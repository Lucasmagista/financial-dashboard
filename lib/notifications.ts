import { sql } from './db';
import { logger } from './logger';

export type NotificationType = 'alert' | 'info' | 'success' | 'warning';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const result = await sql`
      INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
      VALUES (${params.userId}, ${params.type}, ${params.title}, ${params.message}, ${params.link || null}, false, NOW())
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    logger.error('Failed to create notification', error, {
      userId: params.userId,
      type: params.type,
    });
    throw error;
  }
}

// Notification templates
export const NotificationTemplates = {
  budgetExceeded: (userId: string, budgetName: string, percentage: number) =>
    createNotification({
      userId,
      type: 'alert',
      title: 'Orçamento Excedido',
      message: `Seu orçamento "${budgetName}" atingiu ${percentage.toFixed(0)}% do limite`,
      link: '/dashboard/settings',
    }),

  budgetWarning: (userId: string, budgetName: string, percentage: number) =>
    createNotification({
      userId,
      type: 'warning',
      title: 'Alerta de Orçamento',
      message: `Seu orçamento "${budgetName}" está em ${percentage.toFixed(0)}% do limite`,
      link: '/dashboard/settings',
    }),

  goalAchieved: (userId: string, goalName: string) =>
    createNotification({
      userId,
      type: 'success',
      title: 'Meta Alcançada! 🎉',
      message: `Parabéns! Você atingiu a meta "${goalName}"`,
      link: '/dashboard',
    }),

  goalProgress: (userId: string, goalName: string, percentage: number) =>
    createNotification({
      userId,
      type: 'info',
      title: 'Progresso da Meta',
      message: `Sua meta "${goalName}" está em ${percentage.toFixed(0)}%`,
      link: '/dashboard',
    }),

  largeTransaction: (userId: string, amount: number, description: string) =>
    createNotification({
      userId,
      type: 'warning',
      title: 'Transação Grande Detectada',
      message: `Transação de R$ ${amount.toFixed(2)} registrada: ${description}`,
      link: '/dashboard/transactions',
    }),

  recurringTransactionCreated: (userId: string, description: string) =>
    createNotification({
      userId,
      type: 'info',
      title: 'Transação Recorrente Criada',
      message: `Nova transação criada automaticamente: ${description}`,
      link: '/dashboard/transactions',
    }),

  openFinanceConnected: (userId: string, bankName: string) =>
    createNotification({
      userId,
      type: 'success',
      title: 'Banco Conectado',
      message: `${bankName} foi conectado com sucesso via Open Finance`,
      link: '/dashboard/open-finance',
    }),

  openFinanceSyncComplete: (userId: string, transactionCount: number) =>
    createNotification({
      userId,
      type: 'success',
      title: 'Sincronização Completa',
      message: `${transactionCount} transações foram importadas do seu banco`,
      link: '/dashboard/transactions',
    }),

  monthlyReport: (userId: string, month: string) =>
    createNotification({
      userId,
      type: 'info',
      title: 'Relatório Mensal Disponível',
      message: `Seu relatório de ${month} está pronto para visualização`,
      link: '/dashboard/analytics',
    }),

  unusualSpending: (userId: string, category: string, increase: number) =>
    createNotification({
      userId,
      type: 'warning',
      title: 'Gasto Incomum Detectado',
      message: `Gastos em ${category} aumentaram ${increase.toFixed(0)}% este mês`,
      link: '/dashboard/analytics',
    }),

  lowBalance: (userId: string, accountName: string, balance: number) =>
    createNotification({
      userId,
      type: 'alert',
      title: 'Saldo Baixo',
      message: `O saldo da conta ${accountName} está em R$ ${balance.toFixed(2)}`,
      link: '/dashboard',
    }),

  categorySuggestion: (userId: string, transactionDescription: string, suggestedCategory: string) =>
    createNotification({
      userId,
      type: 'info',
      title: 'Sugestão de Categoria',
      message: `A transação "${transactionDescription}" pode ser categorizada como "${suggestedCategory}"`,
      link: '/dashboard/transactions',
    }),
};

// Bulk notification creation
export async function createBulkNotifications(notifications: CreateNotificationParams[]) {
  try {
    const results = [];
    for (const n of notifications) {
      const result = await sql`
        INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
        VALUES (${n.userId}, ${n.type}, ${n.title}, ${n.message}, ${n.link || null}, false, NOW())
        RETURNING *
      `;
      results.push(result[0]);
    }
    return results;
  } catch (error) {
    logger.error('Failed to create bulk notifications', error, {
      count: notifications.length,
    });
    throw error;
  }
}

// Get unread count for a user
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ${userId} AND read = false
    `;

    return parseInt(result[0]?.count || '0');
  } catch (error) {
    logger.error('Failed to get unread count', error, { userId });
    return 0;
  }
}

// Clean up old notifications
export async function cleanupOldNotifications(daysOld: number = 30) {
  try {
    const result = await sql`
      DELETE FROM notifications 
      WHERE read = true 
      AND created_at < NOW() - INTERVAL '1 day' * ${daysOld}
      RETURNING id
    `;

    return result.length;
  } catch (error) {
    logger.error('Failed to cleanup old notifications', error, { daysOld });
    return 0;
  }
}
