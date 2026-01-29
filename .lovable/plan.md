

# Plano: Corrigir Processamento de Boletos - Separar Entrada das Parcelas

## Problema Identificado

Os boletos extraídos do PDF contêm **11 registros**:
- 1 boleto de entrada: R$ 50.000 (com vencimento = data emissão)
- 10 boletos de parcelas: R$ 8.000 cada

A lógica atual **salva todos como installments**, resultando em:
- Entrada duplicada (está em `sales.valor_entrada` E em `installments[0]`)
- Última parcela mostra valor errado (R$ 16.000)

## Dados Atuais no Banco (NF 7826)

```
sales.valor_entrada = 50.000  ← Correto
installments[0] = 50.000      ← ERRADO (duplicou a entrada)
installments[1-8] = 8.000     ← Correto
installments[9] = 16.000?     ← Errado (soma de sobra)
```

## Lógica Correta

```
Boletos recebidos = [50k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k] (11 itens)

Critério: boleto[0].vencimento == emission_date → É ENTRADA
         boleto[0].vencimento != emission_date → É primeira parcela

Se primeiro boleto for entrada:
  - valor_entrada = boletos[0].valor
  - installments = boletos.slice(1) ← Parcelas 1-10

Senão:
  - valor_entrada = total_nf - soma(boletos)
  - installments = todos os boletos
```

## Arquivo a Alterar

### `supabase/functions/parse-nfe-xml/index.ts`

**Linhas 405-444 - Lógica de processamento de boletos:**

```typescript
if (usarBoletos) {
  console.log(`Processando ${boletosArray.length} boletos do e-mail`);
  
  const emissionDate = parsedData.nfe.emissao; // YYYY-MM-DD
  const primeiroBoleto = boletosArray[0];
  
  // Verificar se o primeiro boleto é a entrada
  // Critério: vencimento = data de emissão OU diferença <= 1 dia
  let primeiroBoletoeEntrada = false;
  
  if (primeiroBoleto && primeiroBoleto.vencimento && emissionDate) {
    const diffDias = Math.abs(
      (new Date(primeiroBoleto.vencimento).getTime() - new Date(emissionDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    primeiroBoletoeEntrada = diffDias <= 3; // Até 3 dias de diferença = é entrada
    
    console.log(`Primeiro boleto: venc=${primeiroBoleto.vencimento}, emissao=${emissionDate}, diff=${diffDias} dias, eEntrada=${primeiroBoletoeEntrada}`);
  }
  
  if (primeiroBoletoeEntrada) {
    // CENÁRIO 1: Primeiro boleto é a entrada
    valorEntrada = primeiroBoleto.valor || 0;
    parcelasParaSalvar = boletosArray.slice(1); // Remove primeiro (entrada)
    
    console.log(`Entrada identificada no boleto[0]: R$ ${valorEntrada}`);
    console.log(`Parcelas restantes: ${parcelasParaSalvar.length}`);
  } else {
    // CENÁRIO 2: Todos os boletos são parcelas
    const totalNf = parsedData.valores.total_nf || 0;
    somaBoletos = boletosArray.reduce((sum, b) => sum + (b.valor || 0), 0);
    valorEntrada = totalNf - somaBoletos;
    parcelasParaSalvar = boletosArray;
    
    if (valorEntrada < 0) valorEntrada = 0;
    
    console.log(`Entrada calculada: ${totalNf} - ${somaBoletos} = ${valorEntrada}`);
  }
  
  paymentMethod = parcelasParaSalvar.length > 1 ? 'parcelado_boleto' : 'a_vista';
  
  entradaCalculada = {
    total_nf: parsedData.valores.total_nf || 0,
    soma_boletos: boletosArray.reduce((sum, b) => sum + (b.valor || 0), 0),
    entrada: valorEntrada,
    primeiro_boleto_e_entrada: primeiroBoletoeEntrada,
    parcelas_count: parcelasParaSalvar.length
  };
}
```

**Linhas 497-517 - Inserção de installments:**

```typescript
if (usarBoletos) {
  // Usar parcelasParaSalvar (sem a entrada)
  const installmentsToInsert = parcelasParaSalvar.map((boleto, index) => ({
    organization_id,
    sale_id: sale.id,
    installment_number: index + 1,  // Começa em 1
    value: boleto.valor || 0,
    due_date: boleto.vencimento || null,
    status: 'pendente'
  }));

  const { error: installmentsError } = await supabase
    .from('installments')
    .insert(installmentsToInsert);

  if (installmentsError) {
    console.error('Error inserting installments:', installmentsError);
  } else {
    installmentsInserted = installmentsToInsert.length;
    console.log(`Inserted ${installmentsInserted} installments (sem entrada) for sale ${sale.id}`);
  }
}
```

## Resultado Esperado

### Antes (Errado)
```
sales.valor_entrada = 50.000
installments = [50k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 16k?] (10 itens, dados errados)
```

### Depois (Correto)
```
sales.valor_entrada = 50.000
installments = [8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k, 8k] (10 itens × R$ 8.000)
```

### Verificação
```
Total = 50.000 + (10 × 8.000) = 130.000 ✓
```

## Correção de Dados Existentes

Após deploy, rodar SQL para corrigir NF 7826:

```sql
-- Deletar installments atuais
DELETE FROM installments WHERE sale_id = 'a7543f55-baf3-40b8-8b65-410e039c5abb';

-- A próxima aprovação na calculadora irá criar os installments corretos
```

## Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/parse-nfe-xml/index.ts` | Separar primeiro boleto como entrada se vencimento ~= emissão |

