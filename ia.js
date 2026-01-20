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
Quebre este objetivo em 5 a 7 tarefas pequenas, cada uma levando entre 5 e 30 minutos.

Regras IMPORTANTES:
- Retorne APENAS um JSON válido
- Nada de texto antes ou depois
- Formato EXATO:

[
  {
    "titulo": "string",
    "descricao": "string",
    "tempo": "string"
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
