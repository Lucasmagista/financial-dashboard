import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { uploadReceipt, deleteReceipt, listReceiptsForTransaction } from '@/lib/blob-storage';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const { id: transactionId } = await params;

    // Upload to Vercel Blob
    const receipt = await uploadReceipt(file, transactionId, user.id);

    // Save reference in database
    await sql`INSERT INTO transaction_receipts (transaction_id, user_id, file_url, file_name, file_size, uploaded_at)
       VALUES (${transactionId}, ${user.id}, ${receipt.url}, ${file.name}, ${receipt.size}, ${receipt.uploadedAt})`;

    return NextResponse.json({ receipt });
  } catch (error: any) {
    console.error('[v0] Error uploading receipt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id: transactionId } = await params;

    const result = await sql`SELECT * FROM transaction_receipts 
       WHERE transaction_id = ${transactionId} AND user_id = ${user.id}
       ORDER BY uploaded_at DESC`;

    return NextResponse.json({ receipts: result });
  } catch (error: any) {
    console.error('[v0] Error fetching receipts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { receiptId, fileUrl } = await request.json();

    const { id: transactionId } = await params;

    // Delete from Vercel Blob
    await deleteReceipt(fileUrl);

    // Delete from database
    await sql`DELETE FROM transaction_receipts 
       WHERE id = ${receiptId} AND transaction_id = ${transactionId} AND user_id = ${user.id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[v0] Error deleting receipt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
