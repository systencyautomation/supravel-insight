
## Plano: Recalcular Valor da Parcela ao Alterar Número de Parcelas

### Problema Identificado

Atualmente, quando você edita o número de parcelas, o valor da parcela permanece fixo porque:
1. O sistema carrega o valor das parcelas dos boletos existentes (`valorParcelaReal`)
2. Esse valor tem prioridade sobre o cálculo automático
3. Resultado: `Entrada + (Parcelas × Valor Fixo) ≠ Valor Faturado`

**Exemplo do problema:**
| Campo | Valor Atual |
|-------|-------------|
| Valor Faturado | R$ 23.088,05 |
| Entrada | R$ 8.996,00 |
| 3 parcelas | 3 × R$ 4.697,35 = R$ 14.092,05 |
| **Total** | R$ 23.088,05 ✓ |

Se mudar para 4 parcelas mantendo R$ 4.697,35:
| 4 parcelas | 4 × R$ 4.697,35 = R$ 18.789,40 |
| **Total** | R$ 27.785,40 ✗ (não fecha!) |

---

### Solução Proposta

Recalcular automaticamente o valor da parcela quando o número de parcelas for alterado manualmente.

**Comportamento esperado:**
| Campo | Valor Corrigido |
|-------|-----------------|
| Valor Faturado | R$ 23.088,05 |
| Entrada | R$ 8.996,00 |
| Restante | R$ 14.092,05 |
| 4 parcelas | R$ 14.092,05 ÷ 4 = **R$ 3.523,01** |

---

### Arquivo a Modificar

`src/components/approval/CommissionCalculator.tsx`

---

### Mudanças Detalhadas

#### 1. Adicionar flag para indicar edição manual do número de parcelas

```typescript
// Estado atual
const [qtdParcelas, setQtdParcelas] = useState(0);
const [valorParcelaReal, setValorParcelaReal] = useState(0);

// Adicionar flag para saber se o usuário alterou manualmente
const [parcelasEditadasManualmente, setParcelasEditadasManualmente] = useState(false);
```

#### 2. Modificar lógica de cálculo do valor da parcela

Atualizar o `useMemo` de `valorParcela` para recalcular quando parcelas forem editadas manualmente:

```typescript
const valorParcela = useMemo(() => {
  // Se usuário editou manualmente as parcelas, recalcular
  if (parcelasEditadasManualmente) {
    if (qtdParcelas <= 0) return 0;
    const valorRestante = valorFaturado - valorEntrada;
    return valorRestante / qtdParcelas;
  }
  
  // Se tem valor real (dos boletos) e não foi editado, usar ele
  if (valorParcelaReal > 0) return valorParcelaReal;
  
  // Fallback: calcular automaticamente
  if (qtdParcelas <= 0) return 0;
  const valorRestante = valorFaturado - valorEntrada;
  return valorRestante / qtdParcelas;
}, [valorFaturado, valorEntrada, qtdParcelas, valorParcelaReal, parcelasEditadasManualmente]);
```

#### 3. Handler do campo Número de Parcelas

Modificar o `onChange` para marcar que foi editado manualmente:

```typescript
<Input
  id="qtdParcelas"
  type="number"
  min="0"
  value={qtdParcelas}
  onChange={(e) => {
    setQtdParcelas(parseInt(e.target.value, 10) || 0);
    setParcelasEditadasManualmente(true);
  }}
  className="h-9"
/>
```

#### 4. Também recalcular quando a entrada mudar

Quando o usuário editar a entrada, o valor da parcela também deve se ajustar:

```typescript
<CurrencyInput
  id="valorEntrada"
  value={valorEntrada}
  onChange={(newValue) => {
    setValorEntrada(newValue);
    setParcelasEditadasManualmente(true);
  }}
  className="font-mono h-9"
/>
```

---

### Resultado Esperado

1. Usuário abre venda com 3 parcelas de R$ 4.697,35
2. Muda para 4 parcelas
3. Valor da parcela recalcula automaticamente para R$ 3.523,01
4. Total continua fechando: R$ 8.996,00 + (4 × R$ 3.523,01) ≈ R$ 23.088,05

---

### Seção Técnica

**Diagrama de fluxo do cálculo:**

```text
┌─────────────────────────────┐
│ Usuário altera qtdParcelas  │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ setParcelasEditadasManualmente(true)
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ useMemo(valorParcela)       │
│ detecta flag = true         │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ valorParcela =              │
│ (valorFaturado - entrada)   │
│        / qtdParcelas        │
└─────────────────────────────┘
```

**Dependências do useMemo:**
```typescript
[valorFaturado, valorEntrada, qtdParcelas, valorParcelaReal, parcelasEditadasManualmente]
```

A flag garante que valores originais dos boletos sejam respeitados na carga inicial, mas qualquer edição manual força o recálculo para manter a consistência matemática.
