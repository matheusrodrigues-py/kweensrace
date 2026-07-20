const scheduleSteps = [
  {
    number: '01',
    title: 'Abertura das inscrições',
    date: '20/07',
    datetime: '2026-07-20',
    description: 'O casting abre oficialmente para todas as Kweens.',
    status: 'current',
    statusLabel: 'Em andamento',
    icon: 'document'
  },
  {
    number: '02',
    title: 'Fechamento das inscrições',
    date: '27/07',
    datetime: '2026-07-27',
    description: 'Último dia para enviar seus dados e fotos de apresentação.',
    status: 'future',
    statusLabel: 'Em breve',
    icon: 'lock'
  },
  {
    number: '03',
    title: 'Triagem',
    date: '28/07',
    datetime: '2026-07-28',
    description: 'Análise dos perfis, conceitos e materiais enviados.',
    status: 'future',
    statusLabel: 'Em breve',
    icon: 'search'
  },
  {
    number: '04',
    title: 'Anúncio do elenco',
    date: '31/07',
    datetime: '2026-07-31',
    description: 'Revelação oficial das Kweens selecionadas.',
    status: 'future',
    statusLabel: 'Em breve',
    icon: 'crown'
  },
  {
    number: '05',
    title: 'Início da competição',
    date: '01/08',
    datetime: '2026-08-01',
    description: 'Estreia oficial da corrida pela primeira coroa.',
    status: 'future',
    statusLabel: 'Em breve',
    icon: 'star'
  }
];

const scheduleIcons = {
  document: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM9 11h6M9 15h6M15 3v4h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 8h5M8 11h3"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 4 4 5-7 5 7 4-4-2 12H5zM6 16h12"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.7 6.3.8-4.6 4.4 1.2 6.1-5.6-3-5.6 3 1.2-6.1L3 9.5l6.3-.8z"/></svg>'
};

const scheduleList = document.querySelector('#scheduleList');
if (scheduleList) {
  scheduleList.replaceChildren(...scheduleSteps.map(step => {
    const item = document.createElement('li');
    item.className = `schedule-step is-${step.status}`;
    if (step.status === 'current') item.setAttribute('aria-current', 'step');
    item.innerHTML = `
      <span class="schedule-marker" aria-hidden="true">${step.number}</span>
      <article class="schedule-card">
        <span class="schedule-icon">${scheduleIcons[step.icon]}</span>
        <p class="schedule-eyebrow">Etapa ${step.number}</p>
        <h3>${step.title}</h3>
        <time datetime="${step.datetime}">${step.date}</time>
        <p class="schedule-description">${step.description}</p>
        <span class="schedule-status">${step.statusLabel}</span>
      </article>`;
    return item;
  }));
}

const faqs = [
  ['Quem pode participar?', 'Pessoas maiores de 18 anos com personagem drag criada ou desenvolvida com apoio de inteligência artificial.'],
  ['Preciso ser uma drag performer presencial?', 'Não. O casting valoriza personagens e performances digitais.'],
  ['Minha personagem precisa ser criada totalmente por IA?', 'Não. A IA pode apoiar uma ou mais etapas do processo criativo.'],
  ['Posso usar diferentes ferramentas de IA?', 'Sim, desde que você tenha direito de uso sobre o material enviado.'],
  ['Quantas fotos devo enviar?', 'São três fotos obrigatórias: rosto, corpo inteiro e uma imagem editorial.'],
  ['Posso editar depois do envio?', 'Após o envio, alterações dependerão do contato com a produção.'],
  ['Como saberei se fui selecionada?', 'A produção entrará em contato pelos canais informados.'],
  ['Meus dados estarão protegidos?', 'A versão de produção deverá seguir a LGPD e armazenar dados de forma segura.'],
  ['Existe taxa de inscrição?', 'Não há taxa prevista neste protótipo de casting.']
];

document.querySelector('#faqList')?.replaceChildren(...faqs.map(([question, answer]) => {
  const item = document.createElement('div');
  item.className = 'faq-item';
  item.innerHTML = `<button aria-expanded="false">${question}<span>＋</span></button><div class="faq-answer"><div><p>${answer}</p></div></div>`;
  item.querySelector('button').onclick = event => {
    const open = item.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', open);
    event.currentTarget.querySelector('span').textContent = open ? '−' : '＋';
  };
  return item;
}));

const menu = document.querySelector('.menu');
const nav = document.querySelector('.header nav');
menu?.addEventListener('click', event => {
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', open);
  event.currentTarget.textContent = open ? '×' : '☰';
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('visible'));
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
