#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🎯 Sisteminha do Prota - Gerador de Tarefas\n');

  // 1. Token
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error('❌ Erro: HF_TOKEN não encontrado.');
    console.log('➡ Crie um arquivo .env com: HF_TOKEN=sua_chave');
    console.log('🔗 https://huggingface.co/settings/tokens');
    process.exit(1);
  }

  // 2. Pergunta
  rl.question('Qual seu objetivo? ', async (objetivo) => {
    try {
      console.log('\n⏳ Gerando tarefas...\n');

      const response = await axios.post(
        'https://router.huggingface.co/v1/chat/completions',
        {
          model: 'deepseek-ai/DeepSeek-V3.2:novita',
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente que transforma objetivos em tarefas simples, práticas e realistas.'
            },
            {
              role: 'user',
              content: `
Você é um GERADOR DE MICRO-TAREFAS EXECUTÁVEIS.

Seu único objetivo é transformar um objetivo em ações
tão específicas que possam ser executadas imediatamente,
sem planejamento, sem pesquisa extensa e sem decisões abstratas.

REGRAS OBRIGATÓRIAS:

1. CADA tarefa deve:
- Ter um verbo de ação claro no início (ex: criar, escrever, codar, listar, configurar)
- Poder ser iniciada sem pensar "por onde começo?"
- Produzir algo visível ou mensurável ao final
- Ser executável por UMA pessoa sozinha
- Levar entre 5 e 30 minutos no máximo

2. É PROIBIDO criar tarefas que contenham palavras como:
- planejar, analisar, pesquisar, definir, pensar, estudar, organizar, estruturar, revisar, avaliar

3. É PROIBIDO criar tarefas vagas ou conceituais, como:
- "Definir escopo"
- "Planejar próximos passos"
- "Pensar na arquitetura"
- "Organizar ideias"

4. Se o objetivo for grande ou abstrato:
- Quebre SEMPRE no menor passo físico possível
- Comece por ações que destravam o progresso imediatamente

5. As tarefas devem seguir uma ordem lógica de execução,
onde cada tarefa prepara a próxima.

FORMATO DE SAÍDA (OBRIGATÓRIO):

Retorne APENAS um JSON válido.
Nada de texto antes ou depois.

Formato exato:

[
  {
    "titulo": "string curta e objetiva",
    "descricao": "descrição concreta do que exatamente fazer",
    "tempo": "5-30 min"
  }
]

Objetivo: ${objetivo}
`
            }
          ],
          temperature: 0.7,
          stream: false
        },
        {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 3. Resposta
      const content = response.data.choices[0].message.content;

      // 4. Tentar parsear JSON
      let tarefas;
      try {
        tarefas = JSON.parse(content);
      } catch (err) {
        console.log('⚠️ A IA não retornou JSON puro. Conteúdo bruto:\n');
        console.log(content);
        rl.close();
        return;
      }

      // 5. Exibir bonitinho
      console.log('✅ Tarefas geradas:\n');

      tarefas.forEach((tarefa, index) => {
        console.log(`🧩 ${index + 1}. ${tarefa.titulo}`);
        console.log(`   📌 ${tarefa.descricao}`);
        console.log(`   ⏱️ ${tarefa.tempo}\n`);
      });

    } catch (error) {
      console.error('❌ Erro ao gerar tarefas');

      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Resposta:', error.response.data);
      } else {
        console.error(error.message);
      }
    } finally {
      rl.close();
    }
  });
}

main();
