// WhatsApp notification helper using API (Twilio, WPPConnect, etc.)

import { logger } from './logger';

interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., "5511999999999")
  message: string;
}

export async function sendWhatsAppMessage(params: WhatsAppMessage): Promise<boolean> {
  try {
    // Option 1: Using Twilio API
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return await sendViaTwilio(params);
    }
    
    // Option 2: Using WhatsApp Business API
    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
      return await sendViaWhatsAppAPI(params);
    }

    logger.warn('No WhatsApp provider configured', { to: params.to });
    return false;
  } catch (error) {
    logger.error('Failed to send WhatsApp message', error, { to: params.to });
    return false;
  }
}

async function sendViaTwilio(params: WhatsAppMessage): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., "whatsapp:+14155238886"

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber!,
        To: `whatsapp:+${params.to}`,
        Body: params.message,
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error('Twilio WhatsApp send error', error, { to: params.to });
    return false;
  }
}

async function sendViaWhatsAppAPI(params: WhatsAppMessage): Promise<boolean> {
  try {
    const response = await fetch(process.env.WHATSAPP_API_URL!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.to,
        message: params.message,
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error('WhatsApp API send error', error, { to: params.to });
    return false;
  }
}

// WhatsApp message templates
export const WhatsAppTemplates = {
  budgetAlert: (budgetName: string, percentage: number) => 
    `⚠️ *Alerta de Orçamento*\n\nSeu orçamento "${budgetName}" atingiu ${percentage.toFixed(0)}% do limite.\n\nAcesse: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,

  goalAchieved: (goalName: string) =>
    `🎉 *Parabéns!*\n\nVocê alcançou sua meta "${goalName}"!\n\nContinue assim! 💪`,

  largeTransaction: (amount: number, description: string) =>
    `🔔 *Transação Grande*\n\nR$ ${amount.toFixed(2)} - ${description}\n\nVerifique: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transactions`,

  monthlyReport: (month: string, income: number, expense: number, balance: number) =>
    `📊 *Relatório ${month}*\n\n💰 Receitas: R$ ${income.toFixed(2)}\n💸 Despesas: R$ ${expense.toFixed(2)}\n📈 Saldo: R$ ${balance.toFixed(2)}\n\nVer mais: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics`,

  openFinanceSync: (bankName: string, count: number) =>
    `✅ *Sincronização Completa*\n\n${count} transações importadas do ${bankName}!\n\nRevisar: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transactions`,

  lowBalance: (accountName: string, balance: number) =>
    `⚠️ *Saldo Baixo*\n\n${accountName}: R$ ${balance.toFixed(2)}\n\nAdicione fundos em breve.`,

  recurringTransaction: (description: string, amount: number) =>
    `🔄 *Transação Recorrente*\n\n"${description}" - R$ ${amount.toFixed(2)}\n\nCriada automaticamente.`,

  weeklyDigest: (income: number, expense: number, transactions: number) =>
    `📈 *Resumo Semanal*\n\n💰 Receitas: R$ ${income.toFixed(2)}\n💸 Despesas: R$ ${expense.toFixed(2)}\n📝 ${transactions} transações\n\nDetalhes: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
};

// Batch send
export async function sendBatchWhatsAppMessages(messages: WhatsAppMessage[]): Promise<{
  sent: number;
  failed: number;
}> {
  const results = await Promise.all(
    messages.map(msg => sendWhatsAppMessage(msg))
  );

  return {
    sent: results.filter(r => r).length,
    failed: results.filter(r => !r).length,
  };
}

// Validate phone number
export function isValidWhatsAppNumber(phone: string): boolean {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Must be between 10 and 15 digits
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Format phone number for WhatsApp
export function formatWhatsAppNumber(phone: string): string {
  // Remove non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}
