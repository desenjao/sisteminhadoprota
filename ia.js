#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

class IAGenerator {
  constructor() {
    this.HF_TOKEN = process.env.HF_TOKEN;
    this.useRealAI = !!this.HF_TOKEN;
  }

  async generateTasks(objetivo) {
    if (!this.useRealAI) {
      return this.generateMockTasks(objetivo);
    }

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
            Authorization: `Bearer ${this.HF_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Tentar parsear JSON
      const content = response.data.choices[0].message.content;
      let tarefas;
      
      try {
        tarefas = JSON.parse(content);
      } catch (err) {
        console.error('⚠️ A IA não retornou JSON válido:', content);
        return this.generateMockTasks(objetivo);
      }

      // Formatar para o formato do sistema
      return tarefas.map((tarefa, index) => ({
        id: index + 1,
        title: tarefa.titulo,
        description: tarefa.descricao,
        estimatedTime: this.parseTime(tarefa.tempo)
      }));

    } catch (error) {
      console.error('❌ Erro ao gerar tarefas com IA:', error.message);
      return this.generateMockTasks(objetivo);
    }
  }

  parseTime(timeString) {
    // Converte "5-30 min" para um número (média)
    const match = timeString.match(/(\d+)-(\d+)/);
    if (match) {
      return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
    }
    return 15; // Default
  }

  generateMockTasks(objetivo) {
    console.log('⚠️ Usando IA simulada (modo fallback)');
    
    const mockTasks = [
      {
        title: "Criar arquivo inicial do projeto",
        description: "Criar um arquivo index.html básico com estrutura HTML5",
        estimatedTime: 10
      },
      {
        title: "Escrever primeiro parágrafo",
        description: "Redigir a introdução do conteúdo principal",
        estimatedTime: 15
      },
      {
        title: "Configurar pasta de imagens",
        description: "Criar diretório 'images' e adicionar primeira imagem",
        estimatedTime: 5
      },
      {
        title: "Definir cores principais",
        description: "Escolher 2-3 cores e criar variáveis CSS",
        estimatedTime: 10
      }
    ];

    return mockTasks;
  }

  // Método para CLI (mantido para compatibilidade)
  async runCLI() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🎯 Sisteminha do Prota - Gerador de Tarefas\n');

    if (!this.HF_TOKEN) {
      console.error('❌ Erro: HF_TOKEN não encontrado.');
      console.log('➡ Crie um arquivo .env com: HF_TOKEN=sua_chave');
      console.log('🔗 https://huggingface.co/settings/tokens');
      process.exit(1);
    }

    rl.question('Qual seu objetivo? ', async (objetivo) => {
      const tasks = await this.generateTasks(objetivo);
      
      console.log('\n✅ Tarefas geradas:\n');
      tasks.forEach((task, index) => {
        console.log(`🧩 ${index + 1}. ${task.title}`);
        console.log(`   📌 ${task.description}`);
        console.log(`   ⏱️ ${task.estimatedTime} min\n`);
      });
      
      rl.close();
    });
  }
}

// Se executado diretamente como script CLI
if (require.main === module) {
  const ia = new IAGenerator();
  ia.runCLI();
}

// Exportar para uso como módulo
module.exports = IAGenerator;