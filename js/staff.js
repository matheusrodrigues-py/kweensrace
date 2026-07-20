const login = document.querySelector('#login');
const app = document.querySelector('#app');
const list = document.querySelector('#list');
const detail = document.querySelector('#detail');
let applications = [];

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Erro inesperado.');
  return data;
}

async function start() {
  try {
    const me = await api('/api/staff/me');
    login.hidden = true;
    app.hidden = false;
    document.querySelector('#staffName').textContent = me.username;
    await load();
  } catch {
    login.hidden = false;
    app.hidden = true;
  }
}

document.querySelector('#loginForm').onsubmit = async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api('/api/staff/login', { method: 'POST', body: JSON.stringify(body) });
    document.querySelector('#loginError').textContent = '';
    start();
  } catch (error) {
    document.querySelector('#loginError').textContent = error.message;
  }
};

document.querySelector('#logout').onclick = async () => {
  await api('/api/staff/logout', { method: 'POST', body: '{}' });
  location.reload();
};

async function load() {
  const query = encodeURIComponent(document.querySelector('#search').value);
  const status = encodeURIComponent(document.querySelector('#status').value);
  applications = await api(`/api/staff/applications?q=${query}&status=${status}`);
  list.innerHTML = applications.length ? '' : '<div class="empty">Nenhuma inscrição encontrada.</div>';

  applications.forEach(application => {
    const button = document.createElement('button');
    button.className = 'application-card';
    button.innerHTML = `<strong>${esc(application.personalData.nomeDrag)}</strong><span>${esc(application.personalData.nomeCompleto)}</span><small>${esc(application.protocol)} · ${new Date(application.created_at).toLocaleDateString('pt-BR')}</small><span class="badge">${esc(application.status)}</span>`;
    button.onclick = () => open(application.id, button);
    list.append(button);
  });
}

function fileGallery(files) {
  if (!files.length) return '<p class="empty">Nenhuma imagem enviada.</p>';
  return files.map(file => {
    const imageUrl = `/api/staff/files/${encodeURIComponent(file.id)}`;
    const name = esc(file.original_name);
    const size = (file.size / 1048576).toFixed(1);
    return `<figure class="media-card">
      <button class="media-preview" type="button" data-image="${imageUrl}" data-alt="${name}" aria-label="Ampliar ${name}">
        <img src="${imageUrl}" alt="${name}" loading="lazy">
        <span>Ampliar imagem</span>
      </button>
      <figcaption><strong title="${name}">${name}</strong><small>${size} MB</small></figcaption>
    </figure>`;
  }).join('');
}

async function open(id, button) {
  document.querySelectorAll('.application-card').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const application = await api(`/api/staff/applications/${id}`);
  const personal = application.personalData;
  const profile = application.artisticProfile;

  detail.innerHTML = `<div class="detail-head"><div><p class="kicker">${esc(application.protocol)}</p><h2>${esc(personal.nomeDrag)}</h2></div><p>${new Date(application.created_at).toLocaleString('pt-BR')}</p></div>
    <div class="detail-grid">${Object.entries(personal).map(([key, value]) => `<div><small>${label(key)}</small>${esc(value || '—')}</div>`).join('')}</div>
    <h3>Perfil artístico</h3>
    ${Object.entries(profile).map(([key, value]) => `<div class="profile-block"><h3>${label(key)}</h3><p>${esc(value || '—')}</p></div>`).join('')}
    <h3>Imagens enviadas</h3>
    <div class="media-gallery">${fileGallery(application.files)}</div>
    <div class="staff-review">
      <label>Status<select id="reviewStatus">${['recebida', 'em triagem', 'pré-selecionada', 'entrevista', 'aprovada', 'não selecionada', 'desclassificada'].map(status => `<option ${status === application.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
      <label>Notas internas<textarea id="reviewNotes">${esc(application.staff_notes || '')}</textarea></label>
      <button class="btn crystal" id="saveReview">Salvar avaliação</button>
    </div>`;

  detail.querySelectorAll('[data-image]').forEach(imageButton => {
    imageButton.onclick = () => showImage(imageButton.dataset.image, imageButton.dataset.alt);
  });

  document.querySelector('#saveReview').onclick = async () => {
    await api(`/api/staff/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: document.querySelector('#reviewStatus').value,
        notes: document.querySelector('#reviewNotes').value
      })
    });
    await load();
    button.click();
  };
}

function showImage(src, alt) {
  const lightbox = document.createElement('div');
  lightbox.className = 'image-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', `Visualização de ${alt}`);
  lightbox.innerHTML = `<button type="button" class="lightbox-close" aria-label="Fechar">×</button><img src="${src}" alt="${esc(alt)}">`;

  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    lightbox.remove();
  };
  const onKeydown = event => { if (event.key === 'Escape') close(); };

  lightbox.querySelector('.lightbox-close').onclick = close;
  lightbox.onclick = event => { if (event.target === lightbox) close(); };
  document.addEventListener('keydown', onKeydown);
  document.body.append(lightbox);
  lightbox.querySelector('.lightbox-close').focus();
}

function esc(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function label(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase());
}

let timer;
document.querySelector('#search').oninput = () => {
  clearTimeout(timer);
  timer = setTimeout(load, 250);
};
document.querySelector('#status').onchange = load;
start();
