'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { BRAZILIAN_BANKS, BrazilianBank } from '@/lib/brazilian-banks';
import { useIsMobile } from '@/hooks/use-mobile';
import { BankLogo } from '@/components/bank-logo';

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  { ssr: false }
);

type Phase = 'initial' | 'transition' | 'connecting' | 'success';

const BANK_LOGO_CODE_MAP: Record<string, string> = {
  nubank: '0260',
  inter: '0077',
  itau: '0341',
  bradesco: '0237',
  santander: '0033',
  caixa: '0104',
  bb: '0001',
  c6: '0336',
  neon: '0655',
  pagbank: '0290',
  mercadopago: '0323',
  original: '0212',
  safra: '0422',
  pan: '0623',
  bs2: '0218',
  picpay: '0380',
  btg: '0208',
};

const renderBankLogo = (bank: BrazilianBank, size: number, className = '') => {
  const logoCode = BANK_LOGO_CODE_MAP[bank.code];
  if (logoCode) {
    return (
      <BankLogo
        bankCode={logoCode}
        bankName={bank.name}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white/15 backdrop-blur text-2xl font-semibold ${className}`}
      style={{ width: size, height: size }}
    >
      {bank.logo || bank.name[0]}
    </div>
  );
};

// Feature flag for animations
const ENABLE_ANIMATIONS = true;

// Analytics helper
const trackEvent = (event: string, data?: any) => {
  console.log(`[Analytics] ${event}`, data);
};

function OpenFinanceConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>('initial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'network' | 'auth' | 'config' | 'unknown'>('unknown');
  const [connectToken, setConnectToken] = useState('');
  const [showPluggyWidget, setShowPluggyWidget] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BrazilianBank | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  useEffect(() => {
    const bankCode = searchParams.get('bank');
    if (bankCode) {
      const bank = BRAZILIAN_BANKS.find(b => b.code === bankCode);
      if (bank) {
        setSelectedBank(bank);
        trackEvent('bank_selected', { bank: bankCode });
      }
    }
    fetchConnectToken();
  }, [searchParams]);

  const fetchConnectToken = async () => {
    try {
      const response = await fetch('/api/open-finance/connect-token');
      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('não configurado') || data.error?.includes('credentials')) {
          setErrorType('config');
        } else if (response.status === 401) {
          setErrorType('auth');
        } else {
          setErrorType('network');
        }
        throw new Error(data.error || 'Failed to get connect token');
      }

      setConnectToken(data.accessToken);
      setLoading(false);
      trackEvent('connect_token_fetched');
    } catch (err: any) {
      setError(err.message || 'Erro ao inicializar conexão');
      setLoading(false);
      setErrorType(err.message?.includes('NetworkError') ? 'network' : 'unknown');
      trackEvent('connect_token_error', { error: err.message });
    }
  };

  const handleConnectClick = async () => {
    if (!connectToken) return;
    
    setError('');
    setIsConnecting(true);
    trackEvent('connect_clicked', { bank: selectedBank?.code });
    
    if (ENABLE_ANIMATIONS && selectedBank) {
      setPhase('transition');
      
      const duration = 2000;
      const interval = 50;
      const steps = duration / interval;
      let currentStep = 0;
      
      const progressInterval = setInterval(() => {
        currentStep++;
        setTransitionProgress((currentStep / steps) * 100);
        if (currentStep >= steps) {
          clearInterval(progressInterval);
        }
      }, interval);
      
      await new Promise(resolve => setTimeout(resolve, duration));
      trackEvent('transition_completed', { bank: selectedBank.code });
    }
    
    setPhase('connecting');
    setShowPluggyWidget(true);
    setIsConnecting(false);
  };

  const skipAnimation = () => {
    setPhase('connecting');
    setShowPluggyWidget(true);
    setIsConnecting(false);
    setTransitionProgress(100);
    trackEvent('animation_skipped', { bank: selectedBank?.code });
  };

  const onSuccess = async (itemData: any) => {
    console.log('[v0] Connected successfully:', itemData);
    trackEvent('connection_success', { 
      itemId: itemData.item.id,
      bank: itemData.item.connector.name 
    });
    
    try {
      const response = await fetch('/api/open-finance/save-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemData.item.id,
          institutionId: String(itemData.item.connector.id),
          institutionName: itemData.item.connector.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save connection');
      }

      setShowPluggyWidget(false);
      setPhase('success');
      trackEvent('connection_saved');
      
      setTimeout(() => {
        router.push('/open-finance');
      }, 2500);
    } catch (err: any) {
      setError('Conexão estabelecida, mas houve erro ao salvar: ' + err.message);
      setErrorType('unknown');
      setPhase('initial');
      trackEvent('save_connection_error', { error: err.message });
    }
  };

  const onError = (error: any) => {
    console.error('[v0] Connection error:', error);
    const errorMessage = error.message || 'Tente novamente';
    setError('Erro ao conectar: ' + errorMessage);
    setErrorType('unknown');
    setShowPluggyWidget(false);
    setIsConnecting(false);
    setPhase('initial');
    trackEvent('connection_error', { error: errorMessage });
  };

  const onClose = () => {
    console.log('[v0] User closed the connection flow');
    setShowPluggyWidget(false);
    setIsConnecting(false);
    setTransitionProgress(0);
    setPhase('initial');
    trackEvent('connection_cancelled');
  };

  const getErrorMessage = () => {
    switch (errorType) {
      case 'config':
        return 'Open Finance não está configurado. Entre em contato com o suporte.';
      case 'auth':
        return 'Você precisa estar autenticado para conectar uma conta.';
      case 'network':
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      default:
        return error;
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="min-h-screen bg-background flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando Open Finance...</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Transition Phase
  if (phase === 'transition' && selectedBank) {
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center overflow-hidden relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Skip Button */}
        <motion.button
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"
          onClick={skipAnimation}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Zap className="h-4 w-4" />
          Pular animação
        </motion.button>

        {/* Progress Bar */}
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1 bg-white/30 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-white"
            style={{ width: `${transitionProgress}%` }}
          />
        </motion.div>

        {/* Split Screen Animation - Responsive */}
        <div className={`w-full h-screen flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
          {/* Pluggy Side */}
          <motion.div
            className={`${isMobile ? 'h-1/2 w-full' : 'w-1/2 h-full'} flex flex-col items-center justify-center relative`}
            style={{ backgroundColor: '#21b083' }}
            initial={isMobile ? { y: 0 } : { x: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
          >
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0.8, opacity: 0.5 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-white rounded-3xl flex items-center justify-center mb-4`}>
                <span className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-[#21b083]`}>P</span>
              </div>
              <p className={`text-white ${isMobile ? 'text-base' : 'text-xl'} font-medium`}>Compartilhamento via</p>
              <p className={`text-white ${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>Open Finance</p>
            </motion.div>
            
            <motion.div
              className={`flex items-center ${isMobile ? 'flex-col' : 'gap-4'} z-10`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-white rounded-2xl flex items-center justify-center`}>
                <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-[#21b083]`}>P</span>
              </div>
              <motion.div
                animate={isMobile ? { y: [0, 20, 0] } : { x: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className={`text-white ${isMobile ? 'text-2xl rotate-90' : 'text-3xl'}`}>→→→</div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Bank Side */}
          <motion.div
            className={`${isMobile ? 'h-1/2 w-full' : 'w-1/2 h-full'} flex flex-col items-center justify-center`}
            style={{ 
              backgroundColor: selectedBank.primaryColor,
              color: selectedBank.textColor || '#FFFFFF'
            }}
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center px-4"
            >
              {renderBankLogo(selectedBank, isMobile ? 64 : 96, `${isMobile ? 'text-4xl' : 'text-6xl'} mb-6 mx-auto`)}
              <p className={`${isMobile ? 'text-base' : 'text-xl'} font-medium mb-2`}>Vamos te levar para</p>
              <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{selectedBank.name}</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Connecting Phase
  if (phase === 'connecting') {
    return (
      <>
        {selectedBank && (
          <motion.div 
            className="min-h-screen flex items-center justify-center px-4"
            style={{ 
              backgroundColor: selectedBank.primaryColor,
              color: selectedBank.textColor || '#FFFFFF'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              {renderBankLogo(selectedBank, isMobile ? 64 : 96, `${isMobile ? 'text-4xl' : 'text-6xl'} mb-6 mx-auto`)}
              <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold mb-4`}>
                Conclua sua conexão em {selectedBank.name}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className={`${isMobile ? 'text-base' : 'text-lg'}`}>Abrindo autenticação...</p>
              </div>
            </div>
          </motion.div>
        )}

        {showPluggyWidget && connectToken && (
          <div className="fixed inset-0 z-50">
            <PluggyConnect
              connectToken={connectToken}
              includeSandbox={process.env.NODE_ENV === 'development'}
              onSuccess={onSuccess}
              onError={onError}
              onClose={onClose}
            />
          </div>
        )}
      </>
    );
  }

  // Success Phase
  if (phase === 'success' && selectedBank) {
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ 
          backgroundColor: selectedBank.primaryColor,
          color: selectedBank.textColor || '#FFFFFF'
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="mb-6"
          >
              <div 
                className={`mx-auto ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full flex items-center justify-center`}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <CheckCircle2 className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} />
              </div>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>
              Conta conectada com sucesso!
            </h2>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} opacity-90`}>
              Suas transações do {selectedBank.name} estão sendo sincronizadas
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Initial Phase
  return (
    <motion.div 
      className="min-h-screen bg-background flex items-center justify-center p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {selectedBank ? (
              renderBankLogo(selectedBank, 80, 'h-20 w-20 text-5xl')
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
          </motion.div>
          <CardTitle>
            {selectedBank ? `Conectar ${selectedBank.name}` : 'Conectar sua conta bancária'}
          </CardTitle>
          <CardDescription>
            {selectedBank 
              ? `Use o Open Finance para sincronizar suas transações do ${selectedBank.name} automaticamente`
              : 'Use o Open Finance para sincronizar suas transações automaticamente de forma segura'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{getErrorMessage()}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p>Conexão segura e criptografada</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p>Sincronização automática de transações</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p>Dados protegidos pelo Open Finance Brasil</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <p>Você pode desconectar a qualquer momento</p>
            </div>
          </div>

          <Button 
            onClick={handleConnectClick} 
            className="w-full transition-all hover:scale-105 active:scale-95" 
            size="lg" 
            disabled={!connectToken || loading || isConnecting}
            style={selectedBank ? {
              backgroundColor: selectedBank.primaryColor,
              color: selectedBank.textColor || '#FFFFFF',
            } : undefined}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Conectar {selectedBank ? selectedBank.name : 'banco'}
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => router.push('/open-finance')} 
            className="w-full"
            disabled={isConnecting}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function OpenFinanceConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <OpenFinanceConnectContent />
    </Suspense>
  );
}
