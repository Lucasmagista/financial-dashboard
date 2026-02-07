'use client';

import Image from 'next/image';

interface BankLogoProps {
  bankCode: string;
  bankName: string;
  size?: number;
  className?: string;
}

export function BankLogo({ bankCode, bankName, size = 48, className = '' }: BankLogoProps) {
  // URLs das logos oficiais dos bancos brasileiros
  const logoUrls: Record<string, string> = {
    '0260': 'https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-0-1-1536x1536.png', // Nubank
    '0341': 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-0.png', // Itaú
    '0237': 'https://logodownload.org/wp-content/uploads/2018/09/bradesco-logo-novo-2018-1.png', // Bradesco
    '0033': 'https://logodownload.org/wp-content/uploads/2017/05/santander-logo-1.png', // Santander
    '0104': 'https://logodownload.org/wp-content/uploads/2014/02/caixa-logo-6-1080x244.png', // Caixa
    '0001': 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-0.png', // BB
    '0077': 'https://logodownload.org/wp-content/uploads/2018/11/banco-inter-logo-2-2-1080x274.png', // Inter
    '0336': 'https://logodownload.org/wp-content/uploads/2020/11/c6-bank-logo-1536x302.png', // C6
    '0655': 'https://logodownload.org/wp-content/uploads/2021/11/neon-logo-1536x341.png', // Neon
    '0290': 'https://logodownload.org/wp-content/uploads/2018/05/picpay-logo.png', // PagBank
    '0323': 'https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo-0-1-1080x1080.png', // Mercado Pago
    '0208': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Btg-logo-blue.svg/500px-Btg-logo-blue.svg.png', // BTG
    '0422': 'https://logodownload.org/wp-content/uploads/2018/09/banco-safra-logo.png', // Safra
    '0623': 'https://logodownload.org/wp-content/uploads/2019/07/banco-pan-logo-8.png', // Pan
    '0218': 'https://logodownload.org/wp-content/uploads/2019/10/banco-bs2-logo.png', // BS2
    '0212': 'https://logodownload.org/wp-content/uploads/2018/05/banco-original-logo-16-1536x459.png', // Original
    '0380': 'https://logodownload.org/wp-content/uploads/2018/05/picpay-logo.png', // PicPay
  };

  const logoUrl = logoUrls[bankCode];

  if (!logoUrl) {
    // Fallback: primeira letra do nome do banco
    const initial = bankName && bankName.length > 0 ? bankName[0].toUpperCase() : '?';
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 ${className}`}
        style={{ width: size, height: size, fontSize: size / 2 }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={logoUrl}
        alt={`${bankName} logo`}
        fill
        className="object-contain"
        unoptimized
      />
    </div>
  );
}
