
# Deletar Venda do TIAGO ZANELLA (NF 7826)

## Dados a Deletar

| Tabela | ID | Descrição |
|--------|-----|-----------|
| `installments` | 10 registros | Parcelas da venda |
| `sales` | `a7543f55-baf3-40b8-8b65-410e039c5abb` | Venda NF 7826 |

## Comandos SQL

```sql
-- Deletar parcelas primeiro (por causa da referência)
DELETE FROM installments 
WHERE sale_id = 'a7543f55-baf3-40b8-8b65-410e039c5abb';

-- Deletar a venda
DELETE FROM sales 
WHERE id = 'a7543f55-baf3-40b8-8b65-410e039c5abb';
```

## Após Deletar

Você poderá reenviar o e-mail da NF 7826 e o sistema irá:

1. **Processar o XML** - Extrair dados da nota
2. **Processar os boletos** - Com a nova lógica corrigida:
   - Identificar primeiro boleto (R$ 50k) como **ENTRADA** (não parcela)
   - Criar 10 parcelas de R$ 8.000 cada
3. **Criar a venda** com dados corretos

## Resultado Esperado

```
sales.valor_entrada = R$ 50.000
installments = 10 × R$ 8.000 = R$ 80.000
Total = R$ 130.000 ✓
```
