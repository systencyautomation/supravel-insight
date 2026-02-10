

# Integrar parse-nfe-ai no Fluxo do n8n

## Situacao Atual

O n8n ja envia XML + PDFs (Base64) para o `parse-nfe-xml`, que:
- Insere a venda no banco
- Salva documentos no storage
- Insere installments (boletos ou duplicatas)
- Faz pre-calculo FIPE basico
- **NAO** grava: `valor_presente`, `entrada_calculada`, `analise_ia_status`
- **NAO** chama `parse-nfe-ai`

O `parse-nfe-ai` ja esta pronto mas e uma funcao pura — nunca grava nada.

## Solucao Proposta

Adicionar um **Passo 12** dentro do `parse-nfe-xml`: apos inserir a venda e os installments, chamar internamente o `parse-nfe-ai` com o mesmo XML + PDFs e gravar os resultados no banco. Assim o usuario abre o Inbox com tudo preenchido.

### Por que essa abordagem?

- **Zero mudancas no n8n**: o workflow continua chamando apenas `parse-nfe-xml` como hoje
- **Uma unica chamada**: n8n faz 1 POST, o backend resolve tudo internamente
- **Dados prontos no Inbox**: usuario abre e ve calculadora + comentario IA preenchidos
- **Elimina re-analise no frontend**: economiza tokens de IA

## Mudancas Necessarias

### 1. Atualizar `parse-nfe-xml` (edge function)

Apos o bloco de pre-calculo FIPE (linha ~844), adicionar chamada interna ao `parse-nfe-ai`:

```text
// Apos inserir venda + installments + pre-calc FIPE...

// Chamar parse-nfe-ai para analise completa
const aiResponse = await fetch(
  `${SUPABASE_URL}/functions/v1/parse-nfe-ai`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: ... },
    body: JSON.stringify({ xml_content, pdfs: pdfArray, organization_id })
  }
);

// Se sucesso, gravar campos extras na venda
if (aiResult.success) {
  await supabase.from('sales').update({
    valor_presente: aiResult.calculadora.valor_presente,
    entrada_calculada: aiResult.calculadora.valor_entrada,
    analise_ia_status: aiResult.analise_ia_status,
    ia_commentary: aiResult.ia_commentary,
    // Atualizar tambem os campos ja existentes com valores mais precisos da IA
    over_price: aiResult.calculadora.over_price_bruto,
    over_price_liquido: aiResult.calculadora.over_price_liquido,
    icms: aiResult.calculadora.deducao_icms,
    pis_cofins: aiResult.calculadora.deducao_pis_cofins,
    ir_csll: aiResult.calculadora.deducao_ir_csll,
    commission_calculated: aiResult.calculadora.comissao_total,
  }).eq('id', sale.id);
}
```

### 2. Adicionar coluna `ia_commentary` na tabela `sales`

Nova coluna TEXT para persistir o comentario gerado pela IA.

### 3. Atualizar `PreApprovalInbox.tsx` (frontend)

Modificar o `useEffect` de analise para **nao** re-chamar `parse-nfe-ai` se `analise_ia_status === 'concluido'`. Usar os dados ja gravados no banco, incluindo o novo campo `ia_commentary`.

### 4. Montar array de PDFs no parse-nfe-xml

O n8n ja envia os PDFs no body como `pdfs` (array de objetos com `content_base64`). Precisamos extrair os Base64 puros e passar para o `parse-nfe-ai`:

```text
// Extrair base64 dos PDFs enviados pelo n8n
const pdfContents = [];
if (body.pdfs && Array.isArray(body.pdfs)) {
  for (const pdf of body.pdfs) {
    if (pdf.content_base64) pdfContents.push(pdf.content_base64);
  }
}
```

## Fluxo Final (sem mudancas no n8n)

```text
n8n (a cada 15min)
  |
  +-> fetch_emails (IMAP + extrair anexos)
  +-> parse-nfe-xml (chamada direta)
        |
        +-> Parse XML (deterministico)
        +-> Inserir venda no banco
        +-> Salvar documentos no storage
        +-> Inserir installments
        +-> Pre-calc FIPE basico
        +-> [NOVO] Chamar parse-nfe-ai internamente
        +-> [NOVO] Gravar valor_presente, entrada_calculada,
             analise_ia_status, ia_commentary no banco
        |
        +-> Retornar resposta ao n8n

Usuario abre Inbox -> dados ja prontos, sem re-analise
```

## Secao Tecnica

### Arquivos a modificar
- `supabase/functions/parse-nfe-xml/index.ts` — adicionar chamada ao parse-nfe-ai e gravacao dos campos extras
- `src/pages/PreApprovalInbox.tsx` — remover re-analise quando dados ja existem no banco

### Migracao SQL
```text
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ia_commentary TEXT;
```

### Riscos e mitigacoes
- **Timeout**: parse-nfe-ai pode demorar (IA multimodal). Se falhar, a venda ja esta inserida — analise parcial, pode ser refeita no Inbox
- **Custo tokens**: cada venda consome 1 chamada IA. Sem mudanca vs cenario atual (frontend fazia a mesma chamada)
- **Falha silenciosa**: se parse-nfe-ai falhar, `analise_ia_status` fica null e o Inbox faz fallback para re-analise (comportamento atual)

