import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { logAudit } from '@/lib/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: transactionId } = await params;

    // Verify transaction belongs to user
    const transaction = await sql`
      SELECT t.* FROM transactions t
      WHERE t.id = ${transactionId} AND t.user_id = ${user.id}
    `;

    if (transaction.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Delete old receipt if exists
    if (transaction[0].receipt_url) {
      try {
        await del(transaction[0].receipt_url);
      } catch (err) {
        console.error('[v0] Error deleting old receipt:', err);
      }
    }

    // Upload to Vercel Blob
    const blob = await put(`receipts/${user.id}/${transactionId}-${Date.now()}.${file.type.split('/')[1]}`, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Update transaction with receipt URL
    await sql`
      UPDATE transactions 
      SET receipt_url = ${blob.url}, updated_at = NOW()
      WHERE id = ${transactionId}
    `;

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'transaction.update',
      entityType: 'transaction',
      entityId: transactionId,
      details: { fileName: file.name, fileSize: file.size, url: blob.url, receiptUploaded: true },
      success: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('[v0] Error uploading receipt:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: transactionId } = await params;

    // Get transaction
    const transaction = await sql`
      SELECT t.* FROM transactions t
      WHERE t.id = ${transactionId} AND t.user_id = ${user.id}
    `;

    if (transaction.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!transaction[0].receipt_url) {
      return NextResponse.json({ error: 'No receipt to delete' }, { status: 400 });
    }

    // Delete from Blob
    await del(transaction[0].receipt_url);

    // Update transaction
    await sql`
      UPDATE transactions 
      SET receipt_url = NULL, updated_at = NOW()
      WHERE id = ${transactionId}
    `;

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'transaction.update',
      entityType: 'transaction',
      entityId: transactionId,
      details: { receiptDeleted: true },
      success: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Error deleting receipt:', error);
    return NextResponse.json(
      { error: 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}
