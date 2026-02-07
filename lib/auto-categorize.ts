import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

// Simple rule-based categorization (can be replaced with ML model later)
interface CategoryRule {
  keywords: string[];
  categoryId: string;
  categoryName: string;
  confidence: number;
}

// Built-in rules for common transactions
const DEFAULT_RULES: CategoryRule[] = [
  // Food & Dining
  { keywords: ['restaurante', 'ifood', 'uber eats', 'rappi', 'lanchonete', 'padaria', 'mercado', 'supermercado', 'pão de açúcar', 'carrefour'], categoryName: 'Alimentação', categoryId: '', confidence: 0.9 },
  
  // Transportation
  { keywords: ['uber', '99', 'taxi', 'combustível', 'gasolina', 'posto', 'ipiranga', 'shell', 'estacionamento'], categoryName: 'Transporte', categoryId: '', confidence: 0.9 },
  
  // Housing
  { keywords: ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'copel', 'sanepar', 'telefone', 'vivo', 'claro', 'tim'], categoryName: 'Moradia', categoryId: '', confidence: 0.85 },
  
  // Entertainment
  { keywords: ['cinema', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'ingresso', 'teatro'], categoryName: 'Lazer', categoryId: '', confidence: 0.85 },
  
  // Health
  { keywords: ['farmácia', 'drogaria', 'hospital', 'clínica', 'médico', 'dentista', 'laboratório'], categoryName: 'Saúde', categoryId: '', confidence: 0.9 },
  
  // Education
  { keywords: ['escola', 'faculdade', 'curso', 'livro', 'livraria', 'udemy', 'coursera'], categoryName: 'Educação', categoryId: '', confidence: 0.85 },
  
  // Shopping
  { keywords: ['mercado livre', 'amazon', 'shopee', 'magazine luiza', 'casas bahia', 'americanas', 'loja'], categoryName: 'Compras', categoryId: '', confidence: 0.8 },
  
  // Income
  { keywords: ['salário', 'pagamento', 'freelance', 'pix recebido', 'transferência recebida'], categoryName: 'Salário', categoryId: '', confidence: 0.9 },
];

export async function autoCategorizeTransaction(
  userId: string,
  description: string,
  amount: number,
  type: 'income' | 'expense' | 'transfer'
): Promise<{ categoryId: string | null; confidence: number }> {
  try {
    const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Get user's categories
    const categories = await sql`
      SELECT id, name, type FROM categories
      WHERE user_id = ${userId}
    `;

    // Match against rules
    let bestMatch: { categoryId: string; confidence: number } | null = null;

    for (const rule of DEFAULT_RULES) {
      for (const keyword of rule.keywords) {
        if (normalizedDesc.includes(keyword)) {
          // Find matching category for user
          const matchingCategory = categories.find(
            c => c.name.toLowerCase() === rule.categoryName.toLowerCase() && c.type === type
          );

          if (matchingCategory) {
            if (!bestMatch || rule.confidence > bestMatch.confidence) {
              bestMatch = {
                categoryId: matchingCategory.id,
                confidence: rule.confidence,
              };
            }
          }
          break;
        }
      }
    }

    // Learn from user's history (simple frequency-based learning)
    if (!bestMatch) {
      const similarTransactions = await sql`
        SELECT category_id, COUNT(*) as count
        FROM transactions
        WHERE user_id = ${userId}
          AND type = ${type}
          AND similarity(description, ${description}) > 0.6
          AND category_id IS NOT NULL
        GROUP BY category_id
        ORDER BY count DESC
        LIMIT 1
      `;

      if (similarTransactions.length > 0) {
        bestMatch = {
          categoryId: similarTransactions[0].category_id,
          confidence: 0.7,
        };
      }
    }

    return bestMatch || { categoryId: null, confidence: 0 };
  } catch (error) {
    logger.error('Error auto-categorizing transaction', error, {
      userId,
      type,
      description,
    });
    return { categoryId: null, confidence: 0 };
  }
}

export async function categorizeTransactionAPI(
  userId: string,
  transactionId: string
): Promise<boolean> {
  try {
    // Get transaction
    const transaction = await sql`
      SELECT * FROM transactions
      WHERE id = ${transactionId} AND user_id = ${userId}
    `;

    if (transaction.length === 0) {
      return false;
    }

    const t = transaction[0];
    
    // Skip if already categorized manually
    if (t.category_id && !t.auto_categorized) {
      return false;
    }

    // Auto categorize
    const { categoryId, confidence } = await autoCategorizeTransaction(
      userId,
      t.description,
      t.amount,
      t.type
    );

    if (categoryId && confidence > 0.7) {
      await sql`
        UPDATE transactions
        SET category_id = ${categoryId},
            auto_categorized = true,
            confidence_score = ${confidence},
            updated_at = NOW()
        WHERE id = ${transactionId}
      `;
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error in categorize API', error, {
      userId,
      transactionId,
    });
    return false;
  }
}
