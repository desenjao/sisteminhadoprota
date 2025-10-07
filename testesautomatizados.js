// testar-api.js (ATUALIZADO)
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Configurar axios com timeout maior
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000 // 15 segundos
});

async function testarAPI() {
  console.log('🚀 INICIANDO TESTES DA API DO PROTINHA\n');

  try {
    // 1. Testar status do sistema
    console.log('1. 📋 Testando status do sistema...');
    const status = await api.get('/');
    console.log('✅ Status:', status.data.sistema);
    console.log('');

    // 2. Testar IA
    console.log('2. 🧠 Testando conexão com IA...');
    const iaTest = await api.get('/teste-ia');
    console.log('✅ IA Funcionando!');
    console.log('');

    // 3. Testar criar objetivo RÁPIDO (sem esperar IA)
    console.log('3. 🎯 Testando criação de objetivo...');
    const novoObjetivo = {
      nome: "Aprender Node.js básico",
      categoria: "trabalho", 
      prioridade: "media",
      meta_final: "Entender conceitos fundamentais",
      motivacao: "Crescer profissionalmente"
    };

    const objetivoCriado = await api.post('/objetivos', novoObjetivo);
    console.log('✅ Objetivo criado:', objetivoCriado.data.objetivo.nome);
    console.log('   Mensagem:', objetivoCriado.data.mensagem);
    
    const objetivoId = objetivoCriado.data.objetivo.id;
    
    // Pequena pausa para missões serem geradas
    console.log('   ⏳ Aguardando 3 segundos para missões...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('');

    // 4. Testar listar objetivos
    console.log('4. 📝 Testando listagem de objetivos...');
    const objetivos = await api.get('/objetivos');
    console.log('✅ Total de objetivos:', objetivos.data.total);
    console.log('');

    // 5. Testar missões do objetivo
    console.log('5. 📋 Testando missões do objetivo...');
    const missoes = await api.get(`/missoes?objetivoId=${objetivoId}`);
    console.log('✅ Missões encontradas:', missoes.data.total);
    
    if (missoes.data.missoes.length > 0) {
      console.log('   Primeira missão:', missoes.data.missoes[0].titulo);
      console.log('   Gerada por IA:', missoes.data.missoes[0].gerado_por_ia ? 'Sim 🧠' : 'Não');
    }
    console.log('');

    // 6. Testar dashboard
    console.log('6. 📊 Testando dashboard...');
    const dashboard = await api.get('/dashboard');
    console.log('✅ Dashboard:', {
      objetivos: dashboard.data.resumo.total_objetivos,
      missoes: dashboard.data.resumo.missoes_pendentes + dashboard.data.resumo.missoes_concluidas,
      progresso: dashboard.data.resumo.progresso_geral + '%'
    });
    console.log('');

    console.log('🎉 TESTES PRINCIPAIS CONCLUÍDOS!');
    console.log('💡 A IA funciona em background para não travar a API');

  } catch (error) {
    console.log('❌ ERRO NO TESTE:');
    console.log('   Erro:', error.response?.data?.erro || error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log('   ⚠️  Timeout - A IA está demorando muito');
      console.log('   💡 Solução: Vamos continuar com fallback');
    }
  }
}

// Executar testes
testarAPI();