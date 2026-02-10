import { FileText, File, Download, Eye, Package, Building2, MapPin, Calendar, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/approvalCalculator';
import { format } from 'date-fns';

interface SaleDocument {
  id: string;
  document_type: string;
  filename: string;
  storage_path: string;
}

interface DocumentPreviewProps {
  sale: {
    nfe_number?: string | null;
    nfe_key?: string | null;
    emission_date?: string | null;
    client_name?: string | null;
    client_cnpj?: string | null;
    emitente_nome?: string | null;
    emitente_cnpj?: string | null;
    emitente_uf?: string | null;
    uf_destiny?: string | null;
    total_value?: number | null;
    total_produtos?: number | null;
    total_ipi?: number | null;
    produto_marca?: string | null;
    produto_modelo?: string | null;
    produto_numero_serie?: string | null;
    produto_descricao?: string | null;
    payment_method?: string | null;
  };
  documents: SaleDocument[];
  boletos: Array<{ valor: number; vencimento: string; numero?: string }>;
  onViewPdf?: (doc: SaleDocument) => void;
}

export function DocumentPreview({ sale, documents, boletos, onViewPdf }: DocumentPreviewProps) {
  const xmlDoc = documents.find(d => d.document_type === 'xml');
  const boletoDocs = documents.filter(d => d.document_type === 'boleto');
  const danfeDoc = documents.find(d => d.document_type === 'danfe');

  const paymentLabel = sale.payment_method === 'parcelado_boleto' ? 'Parcelado Boleto' 
    : sale.payment_method === 'parcelado_cartao' ? 'Parcelado Cartão' 
    : 'À Vista';

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* NF-e Summary Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              NF-e {sale.nfe_number || '-'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dates & IDs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Emissão</span>
              </div>
              <span className="font-mono text-xs">
                {sale.emission_date ? format(new Date(sale.emission_date), 'dd/MM/yyyy') : '-'}
              </span>
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>Chave</span>
              </div>
              <span className="font-mono text-[10px] break-all leading-tight">
                {sale.nfe_key || '-'}
              </span>
            </div>

            <Separator className="bg-border/30" />

            {/* Client */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Destinatário
              </div>
              <p className="text-sm font-medium leading-tight">{sale.client_name || '-'}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{sale.client_cnpj || '-'}</span>
                {sale.uf_destiny && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <MapPin className="h-2.5 w-2.5 mr-0.5" />
                    {sale.uf_destiny}
                  </Badge>
                )}
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Emitter */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Emitente
              </div>
              <p className="text-sm font-medium leading-tight">{sale.emitente_nome || '-'}</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{sale.emitente_cnpj || '-'}</span>
                {sale.emitente_uf && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sale.emitente_uf}</Badge>
                )}
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Product */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                Produto
              </div>
              <p className="text-sm font-medium">{sale.produto_descricao || '-'}</p>
              <div className="flex flex-wrap gap-1.5">
                {sale.produto_marca && (
                  <Badge variant="secondary" className="text-[10px]">{sale.produto_marca}</Badge>
                )}
                {sale.produto_modelo && (
                  <Badge variant="outline" className="text-[10px] font-mono">{sale.produto_modelo}</Badge>
                )}
                {sale.produto_numero_serie && (
                  <Badge variant="outline" className="text-[10px] font-mono">SN: {sale.produto_numero_serie}</Badge>
                )}
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Values */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Produtos</span>
                <span className="font-mono">{formatCurrency(sale.total_produtos || 0)}</span>
              </div>
              {(sale.total_ipi ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">IPI</span>
                  <span className="font-mono">{formatCurrency(sale.total_ipi || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold">
                <span>Total NF</span>
                <span className="font-mono text-primary">{formatCurrency(sale.total_value || 0)}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{paymentLabel}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Boletos Extracted */}
        {boletos.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <File className="h-4 w-4 text-warning" />
                Boletos Extraídos
                <Badge variant="secondary" className="text-[10px]">{boletos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {boletos.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-xs rounded-lg bg-muted/30 px-3 py-2">
                    <div>
                      <span className="text-muted-foreground">Parcela {i + 1}</span>
                      {b.vencimento && (
                        <span className="text-muted-foreground ml-2">
                          • {format(new Date(b.vencimento), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(b.valor)}</span>
                  </div>
                ))}
                <Separator className="bg-border/30" />
                <div className="flex justify-between text-xs font-semibold">
                  <span>Total Boletos</span>
                  <span className="font-mono">{formatCurrency(boletos.reduce((s, b) => s + b.valor, 0))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Files */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {xmlDoc && (
                <div className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[140px]">{xmlDoc.filename}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">XML</Badge>
                </div>
              )}
              {danfeDoc && (
                <div className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onViewPdf?.(danfeDoc)}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[140px]">{danfeDoc.filename}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">DANFE</Badge>
                </div>
              )}
              {boletoDocs.map(doc => (
                <div key={doc.id}
                  className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onViewPdf?.(doc)}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[140px]">{doc.filename}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Boleto</Badge>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum documento anexado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
