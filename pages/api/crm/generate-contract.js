import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY não configurada.' });

  const {
    clienteNome,
    contratoInicio,
    contratoFim,
    servicos,
    valorMensal,
    pagamento,
    observacoes,
  } = req.body || {};

  if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });

  const hoje = new Date().toLocaleDateString('pt-BR');

  const prompt = `Você é um advogado especialista em contratos de prestação de serviços de marketing digital no Brasil. Redija um contrato completo, profissional e juridicamente consistente com as seguintes informações:

PARTES:
- CONTRATANTE: ${clienteNome.trim()}
- CONTRATADA: T3 Studio — Agência de Marketing Digital

DADOS DO CONTRATO:
- Data de elaboração: ${hoje}
- Início da vigência: ${contratoInicio ? new Date(contratoInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'a definir'}
- Término da vigência: ${contratoFim ? new Date(contratoFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'a definir'}
- Serviços contratados: ${servicos?.trim() || 'Gestão de redes sociais, criação de conteúdo e estratégia de marketing digital'}
- Valor mensal: ${valorMensal?.trim() ? `R$ ${valorMensal.trim()}` : 'a definir entre as partes'}
- Forma de pagamento: ${pagamento?.trim() || 'Boleto ou transferência bancária, até o dia 10 de cada mês'}
${observacoes?.trim() ? `- Observações adicionais: ${observacoes.trim()}` : ''}

LOCALIZAÇÃO:
- Cidade e Estado: Rondonópolis, Mato Grosso

INSTRUÇÕES DE REDAÇÃO:
- Use linguagem jurídica formal brasileira (PT-BR)
- Inclua as seguintes cláusulas: Objeto do Contrato, Obrigações da Contratada, Obrigações do Contratante, Vigência, Valor e Forma de Pagamento, Direitos de Propriedade Intelectual, Confidencialidade, Rescisão, Penalidades, Foro
- A cláusula de Foro deve indicar o Foro da Comarca de Rondonópolis, Estado de Mato Grosso
- Inclua campos de assinatura ao final com: "Rondonópolis-MT, [DATA]", assinatura e nome por extenso de ambas as partes, com espaço para duas testemunhas
- Use marcadores de campo no formato [CAMPO] para informações que precisam ser preenchidas (ex: CNPJ, endereço, telefone)
- Seja específico sobre os serviços de marketing digital (redes sociais, criação de conteúdo, estratégia)
- Inclua cláusula de aprovação prévia de conteúdo pelo contratante
- Inclua cláusula de crédito da agência nas publicações (quando aplicável)
- Não use negrito, não use asteriscos, não use markdown — apenas texto puro
- Não inclua introdução nem comentários — entregue apenas o texto do contrato pronto, começando com o título "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL"`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });

    const result = await model.generateContent(prompt);
    const contrato = result.response.text();

    if (!contrato?.trim()) throw new Error('O modelo não retornou conteúdo.');
    return res.status(200).json({ contrato });
  } catch (err) {
    console.error('generate-contract error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Erro ao gerar contrato.' });
  }
}
