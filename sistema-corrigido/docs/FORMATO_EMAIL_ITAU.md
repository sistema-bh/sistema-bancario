# Formato dos E-mails de PIX do Itaú

## Informações Configuradas

**Remetente:** `itau@itau.com.br`

**Assunto:** Contém a palavra "PIX"

## Informações Extraídas

O sistema extrai automaticamente as seguintes informações do corpo do e-mail:

1. **Nome do Pagador** - Nome completo da pessoa que fez o PIX
2. **Valor** - Valor em reais (R$) do PIX recebido
3. **Instituição de Pagamento** - Banco ou instituição de origem do PIX

## Padrões de Extração

O sistema utiliza expressões regulares (regex) para identificar:

### Valor
- Padrão: `R$ 150,00` ou `R$ 1.500,00`
- Regex: `/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/`

### Nome do Pagador
- Padrões aceitos:
  - "Você recebeu um Pix de **João Silva**"
  - "PIX recebido de **João Silva**"
  - "Pagador: **João Silva**"
- Regex: `/(?:de|Pagador:|Recebido de)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+)*)/i`

## Exemplo de E-mail

```
De: itau@itau.com.br
Assunto: PIX Recebido

Olá,

Você recebeu um PIX de R$ 150,00 de João Silva.
Instituição: Banco Inter
Data: 04/12/2024 14:30

Att,
Itaú
```

## Observações

- O sistema normaliza os nomes (remove acentos, converte para minúsculas) para melhorar a correspondência
- Se o nome do pagador for diferente do nome cadastrado do cliente, o sistema tentará encontrar similaridades
- Similaridade >= 80% = correspondência automática
- Similaridade < 80% = aguarda vinculação manual na tela de Revisão de PIX
