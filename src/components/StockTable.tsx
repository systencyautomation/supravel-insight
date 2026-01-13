import { useState } from 'react';
import { StockItem } from '@/types/commission';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Pencil, Check, X } from 'lucide-react';

interface StockTableProps {
  stock: StockItem[];
  onUpdate?: (item: StockItem) => void;
}

export function StockTable({ stock, onUpdate }: StockTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<StockItem>>({});

  const handleEdit = (item: StockItem) => {
    setEditingId(item.id);
    setEditValues({
      valorTabela: item.valorTabela,
      percentualComissao: item.percentualComissao
    });
  };

  const handleSave = (item: StockItem) => {
    if (onUpdate) {
      onUpdate({
        ...item,
        valorTabela: editValues.valorTabela ?? item.valorTabela,
        percentualComissao: editValues.percentualComissao ?? item.percentualComissao
      });
    }
    setEditingId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Modelo</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide">Cód. Interno</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">Valor Tabela</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-right">% Comissão</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide text-center">Qtd.</TableHead>
            <TableHead className="font-semibold uppercase text-xs tracking-wide w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stock.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{item.modelo}</TableCell>
              <TableCell className="font-mono text-sm">{item.codInterno}</TableCell>
              <TableCell className="text-right">
                {editingId === item.id ? (
                  <Input
                    type="number"
                    value={editValues.valorTabela}
                    onChange={(e) => setEditValues({ ...editValues, valorTabela: Number(e.target.value) })}
                    className="w-32 text-right font-mono h-8"
                  />
                ) : (
                  <span className="font-mono">{formatCurrency(item.valorTabela)}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingId === item.id ? (
                  <Input
                    type="number"
                    value={editValues.percentualComissao}
                    onChange={(e) => setEditValues({ ...editValues, percentualComissao: Number(e.target.value) })}
                    className="w-20 text-right font-mono h-8"
                  />
                ) : (
                  <span className="font-mono">{item.percentualComissao}%</span>
                )}
              </TableCell>
              <TableCell className="text-center font-mono">{item.quantidade}</TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleSave(item)} className="h-7 w-7 p-0">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 w-7 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="h-7 w-7 p-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
