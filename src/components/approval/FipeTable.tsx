import { useState, useMemo } from 'react';
import { Search, ZoomIn, ZoomOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/approvalCalculator';

export interface InventoryItem {
  id: string;
  model_name: string;
  internal_code: string | null;
  base_price: number | null;
  base_commission_pct: number | null;
  quantity: number | null;
  classe_tipo: string | null;
  marca: string | null;
  capacidade: string | null;
  mastro: string | null;
  bateria: string | null;
  carregador: string | null;
  acessorios: string | null;
  pneus: string | null;
  garfos: string | null;
  cor: string | null;
  moeda: string | null;
  valor_icms_12: number | null;
  valor_icms_7: number | null;
  valor_icms_4: number | null;
}

interface FipeTableProps {
  inventory: InventoryItem[];
  selectedItemId: string | null;
  onSelectItem: (item: InventoryItem) => void;
  autoMatchCode?: string | null;
}

export function FipeTable({ inventory, selectedItemId, onSelectItem, autoMatchCode }: FipeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fontSize, setFontSize] = useState(14);

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    const term = searchTerm.toLowerCase();
    return inventory.filter(item =>
      item.internal_code?.toLowerCase().includes(term) ||
      item.model_name?.toLowerCase().includes(term) ||
      item.marca?.toLowerCase().includes(term) ||
      item.classe_tipo?.toLowerCase().includes(term)
    );
  }, [inventory, searchTerm]);

  const selectedItem = useMemo(() => {
    return inventory.find(item => item.id === selectedItemId);
  }, [inventory, selectedItemId]);

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 20));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 10));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tabela FIPE</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, modelo, marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 border-t">
          <Table style={{ fontSize: `${fontSize}px` }}>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Código</TableHead>
                <TableHead className="sticky top-0 bg-background">Modelo</TableHead>
                <TableHead className="sticky top-0 bg-background">Marca</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Valor</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer transition-colors ${
                      selectedItemId === item.id
                        ? 'bg-primary/10 hover:bg-primary/15'
                        : item.internal_code === autoMatchCode
                        ? 'bg-warning/10 hover:bg-warning/15'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSelectItem(item)}
                  >
                    <TableCell className="font-mono">{item.internal_code || '-'}</TableCell>
                    <TableCell>{item.model_name}</TableCell>
                    <TableCell>{item.marca || '-'}</TableCell>
                    <TableCell className="text-right">
                      {item.base_price ? formatCurrency(item.base_price) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.base_commission_pct ? `${item.base_commission_pct}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Detalhes do item selecionado */}
        {selectedItem && (
          <div className="flex-shrink-0 border-t p-4 bg-muted/30">
            <h4 className="font-semibold mb-2 text-sm">Detalhes do Item Selecionado</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Código:</span> {selectedItem.internal_code}</div>
              <div><span className="text-muted-foreground">Modelo:</span> {selectedItem.model_name}</div>
              <div><span className="text-muted-foreground">Marca:</span> {selectedItem.marca || '-'}</div>
              <div><span className="text-muted-foreground">Tipo:</span> {selectedItem.classe_tipo || '-'}</div>
              <div><span className="text-muted-foreground">Capacidade:</span> {selectedItem.capacidade || '-'}</div>
              <div><span className="text-muted-foreground">Mastro:</span> {selectedItem.mastro || '-'}</div>
              <div><span className="text-muted-foreground">Bateria:</span> {selectedItem.bateria || '-'}</div>
              <div><span className="text-muted-foreground">Carregador:</span> {selectedItem.carregador || '-'}</div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Valor:</span>{' '}
                <span className="font-semibold text-primary">
                  {selectedItem.base_price ? formatCurrency(selectedItem.base_price) : '-'}
                </span>
                {' | '}
                <span className="text-muted-foreground">Comissão:</span>{' '}
                <span className="font-semibold">{selectedItem.base_commission_pct || 0}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
