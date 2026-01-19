import { Copy, Check, FileText, User, Package, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/approvalCalculator';
import type { PendingSale } from '@/hooks/usePendingSales';

interface SaleInfoHeaderProps {
  sale: PendingSale | null;
}

function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '-';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return date;
  }
}

export function SaleInfoHeader({ sale }: SaleInfoHeaderProps) {
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Cliente */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Cliente</span>
            </div>
            <p className="font-semibold truncate" title={sale.client_name || '-'}>
              {sale.client_name || '-'}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatCnpj(sale.client_cnpj)}
            </p>
          </div>
          
          {/* NF-e */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">NF-e</span>
            </div>
            <p className="font-semibold font-mono">{sale.nfe_number || '-'}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(sale.emission_date)}
            </p>
          </div>
          
          {/* Produto */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Produto</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-background border px-2 py-0.5 rounded text-xs font-mono">
                {sale.produto_codigo || 'N/A'}
              </code>
              {sale.produto_codigo && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(sale.produto_codigo!)}
                  title="Copiar código do produto"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={sale.produto_descricao || '-'}>
              {sale.produto_descricao || '-'}
            </p>
          </div>
          
          {/* Valor e UF */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Valor NF</span>
            </div>
            <p className="font-semibold font-mono text-primary">
              {formatCurrency(sale.total_value || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              UF Destino: <span className="font-medium">{sale.uf_destiny || '-'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
