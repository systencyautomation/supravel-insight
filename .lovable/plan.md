

# Nova Edge Function: `parse-nfe-ai`

## Objetivo

Criar uma edge function dedicada que usa IA multimodal para fazer a analise completa de uma venda em uma unica chamada: extrair dados do XML, ler visualmente os boletos PDF, conciliar os valores e retornar todos os campos da calculadora preenchidos com um comentario explicativo da IA.

## Diferenca em relacao ao fluxo atual

Hoje o processamento e fragmentado:
- `parse-nfe-xml` faz parsing deterministico do XML (regex) e insere a venda
- `extract-boleto-pdf` usa IA separadamente so para ler PDFs de boleto
- O pre-calculo FIPE e feito depois, no mesmo `parse-nfe-xml`

A nova `parse-nfe-ai` consolida tudo em **uma unica chamada de IA multimodal** que recebe XML + PDFs juntos e retorna os campos da calculadora prontos, sem inserir nada no banco (funcao pura de analise).

## Input esperado

```text
POST /functions/v1/parse-nfe-ai

Body (JSON):
{
  "xml_content": "string (conteudo completo do XML da NF-e)",
  "pdfs": ["base64string1", "base64string2", ...],
  "organization_id": "uuid"
}
```

- `xml_content`: XML da NF-e (obrigatorio)
- `pdfs`: Array de PDFs em Base64 (opcional, pode ser vazio)
- `organization_id`: UUID da organizacao (obrigatorio, para buscar tabela FIPE e chave IA)

## Logica interna

### Passo 1: Parsing deterministico do XML
Reutilizar as funcoes `parseNfeXml()` e `extractInfAdProd()` ja existentes no `parse-nfe-xml` para extrair:
- Dados da NF-e (numero, chave, emissao, valores)
- Produto (marca, modelo, numero de serie via `<infAdProd>`)
- Emitente/Destinatario (CNPJ, nome, UF)
- Valores (total NF, total produtos, IPI)

### Passo 2: Buscar tabela FIPE da organizacao
Consultar `fipe_documents` para encontrar o `valor_tabela` e `percentual_comissao` baseado no `produto_modelo` extraido do XML.

### Passo 3: Chamar IA multimodal (se houver PDFs)
Enviar os PDFs para o modelo `google/gemini-2.5-flash` via Lovable AI Gateway usando tool calling para extrair parcelas estruturadas:
- Valor de cada boleto
- Data de vencimento de cada boleto
- Numero do boleto (se visivel)

A chave da API sera buscada da coluna `ai_api_key` da organizacao (mesmo padrao do `extract-boleto-pdf`).

### Passo 4: Conciliacao (Entrada Reversa)
- Somar todos os boletos extraidos
- `entrada_calculada = total_nf - soma_boletos`
- Se a entrada for negativa, assumir 0

### Passo 5: Calcular todos os campos da calculadora
Usando a mesma logica do `approvalCalculator.ts`:
- Ajuste de ICMS na tabela (se ICMS origem diferente do destino)
- Over Price = Valor Real (VP) - Valor Tabela Ajustado
- Deducoes em cascata: ICMS, PIS/COFINS (9.25%), IR/CSLL (34%)
- Over Liquido
- Comissao do pedido + Over Liquido = Comissao Total
- Percentual final sobre valor faturado

### Passo 6: Gerar `ia_commentary`
Montar uma string explicativa com os resultados, por exemplo:
- "Dados 100% batendo, entrada de R$ 27.996,50 detectada via entrada reversa (NF - Boletos). Match FIPE encontrado: modelo CDD12J, tabela R$ 180.000,00. Comissao calculada: R$ 8.432,10 (4.2%)"
- Ou se falhar: "Match FIPE nao encontrado para codigo XYZ. Boletos extraidos com sucesso (3 parcelas). Calculo parcial sem valor tabela."

## Output (JSON)

```text
{
  "success": true,
  "ia_commentary": "string explicando a analise",
  
  // Dados extraidos do XML
  "nfe": { chave, numero, serie, emissao },
  "produto": { marca, modelo, numero_serie, descricao },
  "emitente": { cnpj, nome, uf },
  "destinatario": { cnpj, nome, uf },
  "total_nf": number,
  
  // Boletos extraidos dos PDFs
  "boletos": [{ valor, vencimento, numero }],
  
  // Campos da calculadora (todos preenchidos)
  "calculadora": {
    "valor_tabela": number,
    "percentual_comissao": number,
    "icms_tabela": number,        // % detectado da FIPE (4, 7 ou 12)
    "icms_destino": number,       // % baseado na UF destino
    "valor_faturado": number,     // Total NF
    "valor_entrada": number,      // Entrada reversa calculada
    "qtd_parcelas": number,
    "valor_parcela": number,
    "valor_presente": number,     // VP com taxa 2.2% a.m.
    "over_price_bruto": number,
    "deducao_icms": number,
    "deducao_pis_cofins": number,
    "deducao_ir_csll": number,
    "over_price_liquido": number,
    "comissao_pedido": number,
    "comissao_total": number,
    "percentual_final": number
  },
  
  // Status da analise
  "analise_ia_status": "concluido" | "falha",
  "fipe_match": boolean
}
```

## Secao Tecnica

### Arquivo a criar
- `supabase/functions/parse-nfe-ai/index.ts`

### Configuracao necessaria
- Adicionar entrada no `supabase/config.toml`:
```text
[functions.parse-nfe-ai]
verify_jwt = false
```

### Dependencias reutilizadas (copiadas do parse-nfe-xml)
- Funcoes de parsing XML: `extractTag`, `extractNumber`, `extractInfAdProd`, `parseNfeXml`, `extractDuplicatas`, `extractPagamento`
- Tabela ICMS por UF
- Constantes fiscais: PIS/COFINS 9.25%, IR/CSLL 34%, Taxa boleto 2.2%

### Fluxo de dados
```text
Input (xml + pdfs + org_id)
  |
  +-> Parse XML (deterministico)
  +-> Buscar FIPE (Supabase query)
  +-> Enviar PDFs para IA (Lovable AI Gateway)
  |
  +-> Conciliar: entrada = total_nf - soma_boletos
  +-> Calcular VP, Over Price, deducoes, comissao
  +-> Montar ia_commentary
  |
  +-> Retornar JSON completo (SEM inserir no banco)
```

### Importante
- Esta funcao **nao insere nada no banco**. E uma funcao pura de analise que retorna os dados calculados.
- A insercao continua sendo responsabilidade do `parse-nfe-xml` (ou de quem chamar esta funcao).
- Isso permite que no futuro o `parse-nfe-xml` chame o `parse-nfe-ai` internamente, ou que o frontend chame diretamente para pre-visualizacao.

### Tratamento de erros
- Sem `ai_api_key` configurada e PDFs enviados: retorna analise parcial (so XML + FIPE, sem boletos)
- Sem match FIPE: retorna `fipe_match: false` e campos de tabela zerados, com `ia_commentary` explicando
- Falha na IA (429/402): retorna erro com codigo especifico
- XML invalido: retorna erro 400

