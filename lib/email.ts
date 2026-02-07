import nodemailer from 'nodemailer';
import { logger } from './logger';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Configure with environment variables
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    transporter = nodemailer.createTransporter(config);
  }

  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transport.sendMail(mailOptions);
    logger.info('Email sent', { messageId: info.messageId, to: options.to });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email', error, { to: options.to });
    throw error;
  }
}

// Email templates
export const EmailTemplates = {
  budgetAlert: (userName: string, budgetName: string, percentage: number, amount: number, limit: number) => ({
    subject: `⚠️ Alerta de Orçamento: ${budgetName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Alerta de Orçamento</h2>
        <p>Olá ${userName},</p>
        <p>Seu orçamento "<strong>${budgetName}</strong>" atingiu <strong>${percentage.toFixed(0)}%</strong> do limite.</p>
        <div style="background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Gasto atual:</strong> R$ ${amount.toFixed(2)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Limite:</strong> R$ ${limit.toFixed(2)}</p>
        </div>
        <p>Considere revisar seus gastos para não ultrapassar o orçamento planejado.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Dashboard
        </a>
      </div>
    `,
  }),

  goalAchieved: (userName: string, goalName: string, amount: number) => ({
    subject: `🎉 Meta Alcançada: ${goalName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Parabéns! 🎉</h2>
        <p>Olá ${userName},</p>
        <p>Você alcançou sua meta "<strong>${goalName}</strong>"!</p>
        <div style="background-color: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Valor da meta:</strong> R$ ${amount.toFixed(2)}</p>
        </div>
        <p>Continue assim e alcance ainda mais objetivos financeiros!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Metas
        </a>
      </div>
    `,
  }),

  monthlyReport: (userName: string, month: string, income: number, expense: number, balance: number) => ({
    subject: `📊 Relatório Mensal - ${month}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Relatório Mensal - ${month}</h2>
        <p>Olá ${userName},</p>
        <p>Aqui está o resumo das suas finanças em ${month}:</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="margin-bottom: 15px;">
            <span style="color: #10B981; font-size: 14px;">Receitas</span>
            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #10B981;">R$ ${income.toFixed(2)}</p>
          </div>
          <div style="margin-bottom: 15px;">
            <span style="color: #EF4444; font-size: 14px;">Despesas</span>
            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #EF4444;">R$ ${expense.toFixed(2)}</p>
          </div>
          <div>
            <span style="color: #6B7280; font-size: 14px;">Saldo</span>
            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: ${balance >= 0 ? '#10B981' : '#EF4444'};">
              R$ ${balance.toFixed(2)}
            </p>
          </div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Relatório Completo
        </a>
      </div>
    `,
  }),

  largeTransaction: (userName: string, amount: number, description: string, date: string) => ({
    subject: `🔔 Transação Grande Detectada`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Transação Grande Detectada</h2>
        <p>Olá ${userName},</p>
        <p>Uma transação de valor alto foi registrada em sua conta:</p>
        <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Descrição:</strong> ${description}</p>
          <p style="margin: 10px 0;"><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Data:</strong> ${new Date(date).toLocaleDateString('pt-BR')}</p>
        </div>
        <p>Se você não reconhece esta transação, revise seus extratos.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transactions" style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Transações
        </a>
      </div>
    `,
  }),

  openFinanceSync: (userName: string, bankName: string, transactionCount: number) => ({
    subject: `✅ Sincronização Completa - ${bankName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Sincronização Completa</h2>
        <p>Olá ${userName},</p>
        <p>Suas transações do <strong>${bankName}</strong> foram importadas com sucesso!</p>
        <div style="background-color: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>${transactionCount} transações</strong> foram adicionadas à sua conta.</p>
        </div>
        <p>Revise as transações importadas e atualize as categorias se necessário.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transactions" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Transações
        </a>
      </div>
    `,
  }),

  welcome: (userName: string, email: string) => ({
    subject: '👋 Bem-vindo ao Financial Dashboard!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Bem-vindo ao Financial Dashboard! 👋</h2>
        <p>Olá ${userName},</p>
        <p>Estamos felizes em tê-lo conosco! Sua conta foi criada com sucesso.</p>
        <div style="background-color: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
        </div>
        <p>Comece a organizar suas finanças agora mesmo:</p>
        <ul style="line-height: 1.8;">
          <li>Adicione suas primeiras transações</li>
          <li>Conecte suas contas bancárias via Open Finance</li>
          <li>Configure orçamentos e metas</li>
          <li>Explore relatórios e análises</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Acessar Dashboard
        </a>
      </div>
    `,
  }),

  weeklyDigest: (userName: string, weekData: { income: number; expense: number; transactionCount: number; topCategory: string }) => ({
    subject: '📈 Resumo Semanal das suas Finanças',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Resumo Semanal</h2>
        <p>Olá ${userName},</p>
        <p>Veja como foi sua semana financeira:</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Receitas:</strong> R$ ${weekData.income.toFixed(2)}</p>
          <p><strong>Despesas:</strong> R$ ${weekData.expense.toFixed(2)}</p>
          <p><strong>Transações:</strong> ${weekData.transactionCount}</p>
          <p><strong>Categoria mais gasta:</strong> ${weekData.topCategory}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Detalhes
        </a>
      </div>
    `,
  }),
};
