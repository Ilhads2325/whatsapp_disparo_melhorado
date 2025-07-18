const getEtapaSelecionada = () => {
  return document.getElementById('ID_Seleção').value.trim();
};

async function getLeadsNaEtapaDisparo() {
  const etapaId = getEtapaSelecionada();
  if (!etapaId) {
    alert('Por favor, selecione o ID da Etapa.');
    return [];
  }

  const response = await fetch(`/api/v4/leads?filter[statuses][]=${etapaId}`);
  const data = await response.json();
  return data._embedded?.leads || [];
}

const preencherMensagem = (template, lead) => {
  const nome = lead.contact?.name || '';
  const veiculo = lead.custom_fields?.find(f => f.name === 'veiculo')?.values[0]?.value || '';
  return template.replace('{{nome}}', nome).replace('{{veiculo}}', veiculo);
};

const enviarMensagem = async (lead, mensagem) => {
  const telefone = lead.contact?.custom_fields?.find(f => f.name === 'phone')?.values[0]?.value || '';
  const numero = `55${telefone.replace(/\D/g, '')}`;

  const url = `https://api.z-api.io/instances/3E4576C6C271B046BBFEAEE86BC12C1A/token/755E67BD1E33B96E0770899D/send-text`;

  const payload = { phone: numero, message: mensagem };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || result.error) throw new Error(result.error || 'Erro no envio');
  } catch (error) {
    console.error('Erro:', error);
    document.getElementById('status').textContent = `❌ Falha ao enviar para ${numero}`;
  }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const enviarEmLotes = async (leads, mensagemBase) => {
  const statusDiv = document.getElementById('status');
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const mensagem = preencherMensagem(mensagemBase, lead);
    statusDiv.textContent = `(${i + 1}/${leads.length}) Enviando para ${lead.contact.name}...`;
    await enviarMensagem(lead, mensagem);
    await delay(2000);
  }
  statusDiv.textContent = '✅ Todos os envios foram concluídos.';
};

const iniciarDisparo = async () => {
  const mensagem = document.getElementById('mensagem').value;
  const dataHora = new Date(document.getElementById('dataHora').value);
  const agora = new Date();

  if (!mensagem || !document.getElementById('ID_Seleção').value) {
    alert('Preencha todos os campos.');
    return;
  }

  if (dataHora <= agora) {
    alert('Escolha uma data e hora futuras.');
    return;
  }

  document.getElementById('status').textContent = '⏳ Aguardando horário programado...';

  const espera = dataHora.getTime() - agora.getTime();
  setTimeout(async () => {
    const leads = await getLeadsNaEtapaDisparo();
    if (leads.length === 0) {
      document.getElementById('status').textContent = '⚠️ Nenhum lead encontrado.';
      return;
    }
    await enviarEmLotes(leads, mensagem);
  }, espera);
};