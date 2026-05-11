let currentWindow = 'free';
let userPoints = 0;
let userData = null;
const API_URL = 'http://localhost:5000/api';

// --- Auth Logic ---

function toggleAuth(type) {
    document.getElementById('login-form').style.display = type === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = type === 'register' ? 'flex' : 'none';
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        initApp();
    } else {
        showToast(data.msg || 'Error al iniciar sesión');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const referralCode = document.getElementById('reg-referral').value;
    const deviceId = 'web-device-' + Math.random().toString(36).substr(2, 9); // Placeholder for web

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password, deviceId, referralCode })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        initApp();
    } else {
        showToast(data.msg || 'Error al registrarse');
    }
}

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) headers['x-auth-token'] = token;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
        localStorage.removeItem('token');
        checkAuth();
        return null;
    }
    return res.json();
}

// --- App Logic ---

async function initApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';

    // Load initial user data
    userData = await apiFetch('/user/me');
    if (userData) {
        userPoints = userData.points;
        document.getElementById('user-points').innerText = userPoints;
    }

    showWindow('free');
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        initApp();
    } else {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
        toggleAuth('login');
    }
}

function showWindow(name) {
    currentWindow = name;
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('nav-'+name);
    if(btn) btn.classList.add('active');
    render();
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

async function render() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    if (currentWindow === 'free') {
        const ads = await apiFetch('/ads/free') || [];
        main.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin:0">Videos Libres</h2>
                <p style="color:var(--text-muted); font-size:14px">Mira videos y acumula puntos</p>
            </div>
            <div class="ad-grid">
                ${ads.map(ad => `
                    <div class="ad-card" onclick="startVideo('${ad._id}')">
                        <i class="fas fa-play" style="color:var(--primary-green); font-size:30px; margin-bottom:10px"></i>
                        <span>${escapeHTML(ad.title)}</span>
                        <div style="color:var(--primary-green); font-size:12px; margin-top:5px">+2 Puntos</div>
                    </div>
                `).join('')}
                ${ads.length === 0 ? '<div style="grid-column: 1/-1; text-align:center; padding: 40px;">No hay anuncios disponibles en este momento.</div>' : ''}
            </div>
        `;
    } else if (currentWindow === 'random') {
        main.innerHTML = `
            <div style="text-align:center; padding-top:100px">
                <div style="background:var(--card-bg); padding:40px; border-radius:30px; border: 2px solid var(--primary-green); display:inline-block; margin-bottom:20px">
                    <i class="fas fa-play-circle" style="font-size:80px; color:var(--primary-green)"></i>
                </div>
                <h2>Modo Aleatorio</h2>
                <p style="color:var(--text-muted); margin-bottom:30px">Descubre nuevo contenido y gana</p>
                <button class="btn btn-primary" onclick="startVideo()" style="width:200px; margin:auto">VER AHORA</button>
            </div>
        `;
    } else if (currentWindow === 'config') {
        renderConfig();
    } else if (currentWindow === 'kyc') {
        renderKYC();
    } else if (currentWindow === 'withdraw') {
        renderWithdraw();
    } else if (currentWindow === 'referrals') {
        renderReferrals();
    } else if (currentWindow === 'advertiser') {
        renderAdvertiser();
    } else if (currentWindow === 'admin') {
        renderAdmin();
    }
}

function renderAdvertiser() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Panel de Anunciantes</h2>
            <p style="color:var(--text-muted); font-size:14px">Publica tus videos y llega a miles de personas.</p>
        </div>

        <form id="ad-form" class="auth-container" style="min-height:auto; padding:0">
            <div class="form-group">
                <label>Título del Anuncio</label>
                <input type="text" id="ad-title" required placeholder="Ej: Mi Canal de YouTube">
            </div>
            <div class="form-group">
                <label>Video (MP4)</label>
                <input type="file" id="ad-video-file" accept="video/*" required>
            </div>
            <div class="form-group">
                <label>Cantidad de Vistas Deseadas</label>
                <input type="number" id="ad-views" value="1000" min="100">
                <p style="font-size:12px; color:var(--text-muted); margin-top:5px">Costo: $5.00 USD por cada 1,000 vistas</p>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-ad-submit">PUBLICAR ANUNCIO</button>
        </form>
        <p style="font-size:12px; color:var(--text-muted); margin-top:15px; text-align:center">
            * Al publicar, tu anuncio pasará a revisión. Deberás completar el pago una vez sea aprobado.
        </p>
    `;

    document.getElementById('ad-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-ad-submit');
        btn.disabled = true;
        btn.innerText = 'Subiendo...';

        const formData = new FormData();
        formData.append('title', document.getElementById('ad-title').value);
        formData.append('video', document.getElementById('ad-video-file').files[0]);
        formData.append('totalViews', document.getElementById('ad-views').value);
        formData.append('cpm', 5);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/advertiser/ads`, {
                method: 'POST',
                headers: { 'x-auth-token': token },
                body: formData
            });

            if (res.ok) {
                showToast('Anuncio enviado a revisión');
                showWindow('config');
            } else {
                showToast('Error al subir anuncio');
                btn.disabled = false;
                btn.innerText = 'PUBLICAR ANUNCIO';
            }
        } catch (err) {
            alert('Error de conexión');
            btn.disabled = false;
        }
    };
}

async function renderAdmin() {
    const main = document.getElementById('main-content');
    const stats = await apiFetch('/admin/stats');

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Panel Administrativo</h2>
        </div>

        <div class="ad-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:20px">
            <div class="ad-card" style="aspect-ratio:auto; padding:15px">
                <div style="font-size:24px; color:var(--primary-green)">${stats.totalUsers}</div>
                <div style="font-size:10px; color:var(--text-muted)">USUARIOS</div>
            </div>
            <div class="ad-card" style="aspect-ratio:auto; padding:15px">
                <div style="font-size:24px; color:var(--primary-green)">${stats.totalViews}</div>
                <div style="font-size:10px; color:var(--text-muted)">VISTAS</div>
            </div>
        </div>

        <div class="config-item" onclick="adminList('kycs')">
            <i class="fas fa-id-card"></i>
            <div class="config-info">
                <h4>Revisar KYCs</h4>
                <p>${stats.pendingKYCs} pendientes</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        <div class="config-item" onclick="adminList('withdrawals')">
            <i class="fas fa-money-bill-wave"></i>
            <div class="config-info">
                <h4>Pagos Pendientes</h4>
                <p>${stats.pendingWithdrawals} solicitudes</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        <div class="config-item" onclick="adminList('ads')">
            <i class="fas fa-video"></i>
            <div class="config-info">
                <h4>Aprobar Anuncios</h4>
                <p>${stats.pendingAds} por revisar</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>
    `;
}

async function adminList(type) {
    const main = document.getElementById('main-content');
    main.innerHTML = 'Cargando...';

    if (type === 'kycs') {
        const list = await apiFetch('/admin/kycs');
        main.innerHTML = `<h3>Revisiones de Identidad</h3>` + list.map(u => `
            <div class="config-item" style="flex-direction:column; align-items:flex-start">
                <div><b>${escapeHTML(u.username)}</b> (${escapeHTML(u.kycData.fullName)})</div>
                <div style="font-size:12px; color:var(--text-muted)">ID: ${escapeHTML(u.kycData.idNumber)}</div>
                <div style="display:flex; gap:10px; margin-top:10px">
                    <a href="http://localhost:5000/${u.kycData.documentImageUrl}" target="_blank" style="color:var(--primary-green); font-size:12px">Ver Documento</a>
                    <a href="http://localhost:5000/${u.kycData.selfieImageUrl}" target="_blank" style="color:var(--primary-green); font-size:12px">Ver Selfie</a>
                </div>
                <div style="display:flex; gap:10px; width:100%; margin-top:15px">
                    <button class="btn btn-primary" style="padding:10px; font-size:12px" onclick="updateStatus('kyc', '${u._id}', 'verified')">APROBAR</button>
                    <button class="btn" style="padding:10px; font-size:12px; background:var(--danger); color:white" onclick="updateStatus('kyc', '${u._id}', 'rejected')">RECHAZAR</button>
                </div>
            </div>
        `).join('');
    } else if (type === 'withdrawals') {
        const list = await apiFetch('/admin/withdrawals');
        main.innerHTML = `<h3>Solicitudes de Pago</h3>` + list.map(w => `
            <div class="config-item" style="flex-direction:column; align-items:flex-start">
                <div><b>${escapeHTML(w.user.username)}</b> - $${w.amount.toFixed(2)}</div>
                <div style="font-size:12px; color:var(--text-muted)">Método: ${escapeHTML(w.method)}</div>
                <div style="font-size:12px; color:var(--text-muted)">Detalles: ${escapeHTML(w.details)}</div>
                <div style="display:flex; gap:10px; width:100%; margin-top:15px">
                    <button class="btn btn-primary" style="padding:10px; font-size:12px" onclick="updateStatus('withdrawal', '${w._id}', 'approved')">PAGADO</button>
                    <button class="btn" style="padding:10px; font-size:12px; background:var(--danger); color:white" onclick="updateStatus('withdrawal', '${w._id}', 'rejected')">RECHAZAR</button>
                </div>
            </div>
        `).join('');
    } else if (type === 'ads') {
        const list = await apiFetch('/admin/ads/pending');
        main.innerHTML = `<h3>Anuncios Pendientes</h3>` + list.map(ad => `
            <div class="config-item" style="flex-direction:column; align-items:flex-start">
                <div><b>${escapeHTML(ad.title)}</b></div>
                <div style="font-size:12px; color:var(--text-muted)">Por: ${escapeHTML(ad.advertiser.username)} | Vistas: ${ad.totalViewsOrdered}</div>
                <a href="http://localhost:5000/${ad.videoUrl}" target="_blank" style="color:var(--primary-green); font-size:12px; margin-top:10px">Ver Video</a>
                <div style="display:flex; gap:10px; width:100%; margin-top:15px">
                    <button class="btn btn-primary" style="padding:10px; font-size:12px" onclick="updateStatus('ad', '${ad._id}', 'active')">APROBAR</button>
                    <button class="btn" style="padding:10px; font-size:12px; background:var(--danger); color:white" onclick="updateStatus('ad', '${ad._id}', 'rejected')">RECHAZAR</button>
                </div>
            </div>
        `).join('');
    }
}

async function updateStatus(type, id, status) {
    const res = await apiFetch(`/admin/${type}/${id}`, {
        method: 'POST',
        body: JSON.stringify({ status })
    });
    if (res) {
        showToast('Actualizado con éxito');
        showWindow('admin');
    }
}

function showToast(msg) {
    const toast = document.getElementById('notification-toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function renderReferrals() {
    const main = document.getElementById('main-content');
    const referralCode = userData._id; // Using User ID as referral code for simplicity

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Invita Amigos</h2>
            <p style="color:var(--text-muted); font-size:14px">Gana puntos extra recomendando Verd.</p>
        </div>

        <div style="background:var(--card-bg); padding:30px; border-radius:15px; margin-bottom:20px; text-align:center; border: 2px dashed var(--primary-green)">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px">TU CÓDIGO DE REFERIDO</div>
            <div style="font-size:24px; font-weight:800; letter-spacing:2px; color:var(--primary-green)">${referralCode}</div>
            <button class="btn btn-link" style="margin:auto; margin-top:10px" onclick="copyReferral('${referralCode}')">
                <i class="fas fa-copy"></i> Copiar Código
            </button>
        </div>

        <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px;">
            <h3 style="margin-top:0">¿Cómo funciona?</h3>
            <ul style="color:var(--text-muted); font-size:14px; padding-left:20px">
                <li style="margin-bottom:10px">Comparte tu código con un amigo.</li>
                <li style="margin-bottom:10px">Tu amigo se registra usando tu código.</li>
                <li>Cuando tu amigo vea sus primeros <b>20 videos</b>, tú recibirás <b>100 puntos</b> de regalo.</li>
            </ul>
        </div>

        <div>
            <h3>Mis Invitados</h3>
            <div id="referrals-list" class="config-item" style="justify-content:center">
                <p style="color:var(--text-muted)">Has invitado a ${userData.referralCount || 0} personas.</p>
            </div>
        </div>
    `;
}

function copyReferral(code) {
    navigator.clipboard.writeText(code);
    alert('Código copiado al portapapeles');
}

function renderWithdraw() {
    const main = document.getElementById('main-content');

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Retirar Fondos</h2>
            <p style="color:var(--text-muted); font-size:14px">Convierte tus puntos en dinero real o premios.</p>
        </div>

        <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; text-align:center; border: 1px solid #333">
            <div style="font-size:12px; color:var(--text-muted)">SALDO DISPONIBLE</div>
            <div style="font-size:32px; font-weight:800; color:var(--primary-green)">${userPoints} <span style="font-size:16px">pts</span></div>
            <div style="font-size:14px; margin-top:5px">≈ $${(userPoints / 500).toFixed(2)} USD</div>
        </div>

        <div class="auth-container" style="min-height:auto; padding:0">
            <div class="form-group">
                <label>Método de Retiro</label>
                <select id="wd-method" onchange="updateWithdrawFields()">
                    <option value="PayPal">PayPal</option>
                    <option value="In-Game">Monedas de Videojuegos (FreeFire, Robux)</option>
                </select>
            </div>

            <div id="wd-details-container">
                <div class="form-group">
                    <label id="wd-label">Correo de PayPal</label>
                    <input type="text" id="wd-details" placeholder="ejemplo@mail.com">
                </div>
            </div>

            <div class="form-group">
                <label>Monto a Retirar (Mínimo 5000 pts)</label>
                <select id="wd-amount">
                    <option value="5000">5,000 pts ($10.00)</option>
                    <option value="10000">10,000 pts ($20.00)</option>
                    <option value="25000">25,000 pts ($50.00)</option>
                    <option value="50000">50,000 pts ($100.00)</option>
                </select>
            </div>

            <button class="btn btn-primary" id="btn-wd-submit" onclick="submitWithdraw()">SOLICITAR RETIRO</button>
        </div>

        <div style="margin-top:30px">
            <h3>Historial de Retiros</h3>
            <div id="withdraw-history">Cargando historial...</div>
        </div>
    `;
    loadWithdrawHistory();
}

function updateWithdrawFields() {
    const method = document.getElementById('wd-method').value;
    const label = document.getElementById('wd-label');
    const details = document.getElementById('wd-details');

    if (method === 'PayPal') {
        label.innerText = 'Correo de PayPal';
        details.placeholder = 'ejemplo@mail.com';
    } else {
        label.innerText = 'ID de Jugador y Juego';
        details.placeholder = 'Ej: ID 12345678 - Free Fire';
    }
}

async function submitWithdraw() {
    const method = document.getElementById('wd-method').value;
    const details = document.getElementById('wd-details').value;
    const amountPoints = parseInt(document.getElementById('wd-amount').value);

    if (!details) return alert('Por favor ingresa los detalles del retiro');

    const btn = document.getElementById('btn-wd-submit');
    btn.disabled = true;

    const res = await apiFetch('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
            method,
            currency: method === 'PayPal' ? 'USD' : 'In-Game',
            details,
            amountPoints
        })
    });

    if (res && res.points !== undefined) {
        showToast('Solicitud enviada con éxito');
        userPoints = res.points;
        document.getElementById('user-points').innerText = userPoints;
        renderWithdraw();
    } else if (res && res.msg) {
        showToast(res.msg);
        btn.disabled = false;
    }
}

async function loadWithdrawHistory() {
    const history = await apiFetch('/withdrawals/me');
    const container = document.getElementById('withdraw-history');
    if (!history || history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted)">No tienes retiros previos.</p>';
        return;
    }

    container.innerHTML = history.map(w => `
        <div class="config-item" style="padding:10px">
            <div class="config-info">
                <h4 style="font-size:14px">${w.method} - ${w.amountPoints || w.pointsDeducted} pts</h4>
                <p style="font-size:10px">${new Date(w.createdAt).toLocaleDateString()}</p>
            </div>
            <span class="badge badge-${w.status}">${w.status}</span>
        </div>
    `).join('');
}

function renderKYC() {
    const main = document.getElementById('main-content');

    if (userData.verificationStatus === 'verified') {
        main.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fas fa-check-circle" style="font-size:80px; color:var(--primary-green); margin-bottom:20px"></i>
                <h2>Cuenta Verificada</h2>
                <p style="color:var(--text-muted)">Tu identidad ha sido confirmada exitosamente. Ya puedes realizar retiros sin límites.</p>
                <button class="btn btn-primary" onclick="showWindow('config')" style="margin-top:30px">VOLVER</button>
            </div>
        `;
        return;
    }

    if (userData.verificationStatus === 'pending') {
        main.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fas fa-clock" style="font-size:80px; color:orange; margin-bottom:20px"></i>
                <h2>Verificación Pendiente</h2>
                <p style="color:var(--text-muted)">Estamos revisando tus documentos. Este proceso suele tardar entre 24 y 48 horas.</p>
                <button class="btn btn-primary" onclick="showWindow('config')" style="margin-top:30px">VOLVER</button>
            </div>
        `;
        return;
    }

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Verifica tu Identidad</h2>
            <p style="color:var(--text-muted); font-size:14px">Necesario para procesar tus pagos de forma segura.</p>
        </div>

        <div class="auth-container" style="min-height:auto; padding:0">
            <div class="form-group">
                <label>Nombre Completo (como aparece en ID)</label>
                <input type="text" id="kyc-name" placeholder="Ej: Juan Pérez">
            </div>
            <div class="form-group">
                <label>Número de Identificación</label>
                <input type="text" id="kyc-id" placeholder="Cédula, DNI o Pasaporte">
            </div>
            <div class="form-group">
                <label>Foto de Documento (Frontal)</label>
                <input type="file" id="kyc-doc" accept="image/*">
            </div>
            <div class="form-group">
                <label>Foto de tu Rostro (Selfie)</label>
                <input type="file" id="kyc-selfie" accept="image/*">
            </div>
            <button class="btn btn-primary" id="btn-kyc-submit" onclick="submitKYC()">ENVIAR PARA REVISIÓN</button>
        </div>
    `;
}

async function submitKYC() {
    const name = document.getElementById('kyc-name').value;
    const id = document.getElementById('kyc-id').value;
    const docFile = document.getElementById('kyc-doc').files[0];
    const selfieFile = document.getElementById('kyc-selfie').files[0];

    if (!name || !id || !docFile || !selfieFile) {
        return alert('Por favor completa todos los campos y sube las fotos.');
    }

    const btn = document.getElementById('btn-kyc-submit');
    btn.disabled = true;
    btn.innerText = 'Subiendo...';

    const formData = new FormData();
    formData.append('fullName', name);
    formData.append('idNumber', id);
    formData.append('document', docFile);
    formData.append('selfie', selfieFile);

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/user/kyc`, {
            method: 'POST',
            headers: { 'x-auth-token': token },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Documentos enviados con éxito');
            userData.verificationStatus = 'pending';
            showWindow('kyc');
        } else {
            showToast(data.msg || 'Error al enviar documentos');
            btn.disabled = false;
            btn.innerText = 'ENVIAR PARA REVISIÓN';
        }
    } catch (err) {
        alert('Error de conexión');
        btn.disabled = false;
        btn.innerText = 'ENVIAR PARA REVISIÓN';
    }
}

async function renderConfig() {
    const main = document.getElementById('main-content');
    if (!userData) userData = await apiFetch('/user/me');

    main.innerHTML = `
        <div style="text-align:center; padding: 20px 0;">
            <div style="width:80px; height:80px; background:var(--primary-green); border-radius:50%; margin:auto; display:flex; align-items:center; justify-content:center; color:black; font-size:30px; font-weight:bold; margin-bottom:10px">
                ${escapeHTML(userData.username[0].toUpperCase())}
            </div>
            <h2 style="margin:0">${escapeHTML(userData.username)}</h2>
            <p style="color:var(--text-muted); font-size:14px">${escapeHTML(userData.email)}</p>
        </div>

        <div class="config-item">
            <i class="fas fa-wallet"></i>
            <div class="config-info">
                <h4>Mis Puntos</h4>
                <p>${userPoints} puntos acumulados</p>
            </div>
            <button class="btn btn-primary" style="width:auto; padding: 8px 15px; font-size:12px" onclick="showWindow('withdraw')">RETRAR</button>
        </div>

        <div class="config-item" onclick="showWindow('kyc')">
            <i class="fas fa-id-card"></i>
            <div class="config-info">
                <h4>Verificación (KYC)</h4>
                <p>Estado: <span class="badge badge-${userData.verificationStatus}">${userData.verificationStatus}</span></p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        <div class="config-item" onclick="showWindow('referrals')">
            <i class="fas fa-users"></i>
            <div class="config-info">
                <h4>Referidos</h4>
                <p>${userData.referralCount || 0} personas invitadas</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        <div class="config-item" onclick="showWindow('advertiser')">
            <i class="fas fa-ad"></i>
            <div class="config-info">
                <h4>Anunciantes</h4>
                <p>Publica tus propios videos</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        ${userData.role === 'admin' ? `
            <div class="config-item" onclick="showWindow('admin')">
                <i class="fas fa-user-shield"></i>
                <div class="config-info">
                    <h4>Panel de Control</h4>
                    <p>Administración de la plataforma</p>
                </div>
                <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
            </div>
        ` : ''}

        <button class="btn btn-link" onclick="handleLogout()" style="color:var(--danger); margin-top:30px">Cerrar Sesión</button>
    `;
}

function handleLogout() {
    localStorage.removeItem('token');
    checkAuth();
}

async function startVideo(adId) {
    if (!adId) {
        const ad = await apiFetch('/ads/random');
        if (!ad || !ad._id) return alert('No hay anuncios disponibles');
        adId = ad._id;
    }

    const ad = await apiFetch(`/ads/${adId}`); // Need to implement this route or use cached data
    if (!ad) return;

    const m = document.getElementById('video-modal');
    const v = document.getElementById('ad-video');

    // For demo, if no real video URL, use a placeholder
    v.src = ad.videoUrl ? (ad.videoUrl.startsWith('http') ? ad.videoUrl : `http://localhost:5000/${ad.videoUrl}`) : 'https://www.w3schools.com/html/mov_bbb.mp4';

    m.style.display = 'flex';
    v.play();

    let t = 15;
    document.getElementById('video-timer').innerText = t + 's';

    const i = setInterval(async () => {
        t--;
        document.getElementById('video-timer').innerText = t + 's';
        if (t <= 0) {
            clearInterval(i);
            m.style.display = 'none';
            v.pause();

            const res = await apiFetch(`/ads/complete/${adId}`, { method: 'POST' });
            if (res && res.points !== undefined) {
                userPoints = res.points;
                document.getElementById('user-points').innerText = userPoints;
                showToast('¡Has ganado 2 puntos!');
            } else if (res && res.msg) {
                showToast(res.msg);
            }
        }
    }, 1000);
}

// Initialize
checkAuth();
