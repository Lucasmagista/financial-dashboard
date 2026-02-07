'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, X, File, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Receipt {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: string;
}

interface ReceiptUploadProps {
  transactionId: string;
  onUploadComplete?: () => void;
}

export function ReceiptUpload({ transactionId, onUploadComplete }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const { toast } = useToast();

  // Load existing receipts
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const response = await fetch(`/api/transactions/${transactionId}/receipts`);
        if (response.ok) {
          const data = await response.json();
          setReceipts(data.receipts || []);
        }
      } catch (error) {
        console.error('Failed to load receipts:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReceipts();
  }, [transactionId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Tipo de arquivo inválido. Use JPG, PNG ou PDF.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/transactions/${transactionId}/receipts`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setReceipts([...receipts, data.receipt]);
      
      toast({
        title: 'Sucesso',
        description: 'Comprovante enviado com sucesso!',
      });

      onUploadComplete?.();
      
      // Reset input
      e.target.value = '';
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao enviar comprovante.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receiptId: string, url: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/receipts?receiptId=${receiptId}&url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setReceipts(receipts.filter(r => r.id !== receiptId));
      
      toast({
        title: 'Sucesso',
        description: 'Comprovante removido.',
      });

      onUploadComplete?.();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao remover comprovante.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="receipt-upload">Comprovantes</Label>
        <div className="mt-2 flex items-center gap-4">
          <Input
            id="receipt-upload"
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileUpload}
            disabled={uploading || loading}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('receipt-upload')?.click()}
            disabled={uploading || loading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Comprovante
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou PDF (máx. 10MB)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : receipts.length > 0 ? (
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {receipt.fileName}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {new Date(receipt.uploadedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(receipt.id, receipt.url)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum comprovante anexado
        </p>
      )}
    </div>
  );
}
