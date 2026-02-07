import { put, del, list, type PutBlobResult, type ListBlobResult } from '@vercel/blob';

export interface ReceiptUpload {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export async function uploadReceipt(
  file: File,
  transactionId: string,
  userId: string
): Promise<ReceiptUpload> {
  const filename = `receipts/${userId}/${transactionId}/${Date.now()}-${file.name}`;
  
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    size: file.size,
    uploadedAt: new Date(),
  };
}

export async function deleteReceipt(url: string): Promise<void> {
  await del(url);
}

export async function listReceiptsForTransaction(
  userId: string,
  transactionId: string
): Promise<ListBlobResult['blobs']> {
  const { blobs } = await list({
    prefix: `receipts/${userId}/${transactionId}/`,
  });
  
  return blobs;
}

export async function listReceiptsForUser(userId: string): Promise<ListBlobResult['blobs']> {
  const { blobs } = await list({
    prefix: `receipts/${userId}/`,
  });
  
  return blobs;
}
