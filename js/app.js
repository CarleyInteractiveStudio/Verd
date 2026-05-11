let currentWindow = 'free';
let userPoints = 0;
let userData = null;
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
const API_URL = `${API_BASE}/api`;

// --- Auth Logic ---

function toggleAuth(type) {
    document.getElementById('login-form').style.display = type === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = type === 'register' ? 'flex' : 'none';
}

function initFeedLogic() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    const items = container.querySelectorAll('.feed-item');
    const timers = {};

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            const adId = entry.target.getAttribute('data-ad-id');

            if (entry.isIntersecting) {
                video.play();
                startFeedTimer(adId, timers);
            } else {
                video.pause();
                if (timers[adId]) {
                    clearInterval(timers[adId].interval);
                    delete timers[adId];
                }
            }
        });
    }, { threshold: 0.8 });

    items.forEach(item => observer.observe(item));
}

function startFeedTimer(adId, timers) {
    if (timers[adId]) return;

    let t = 15;
    const timerEl = document.getElementById(`timer-${adId}`);

    timers[adId] = {
        seconds: t,
        interval: setInterval(async () => {
            t--;
            if (timerEl) timerEl.innerText = t + 's';
            if (t <= 0) {
                clearInterval(timers[adId].interval);
                if (timerEl) timerEl.style.display = 'none';

                const res = await apiFetch(`/ads/complete/${adId}`, { method: 'POST' });
                if (res && res.points !== undefined) {
                    userPoints = res.points;
                    document.getElementById('user-points').innerText = userPoints;
                    showToast('¡Has ganado 2 puntos!');
                }
            }
        }, 1000)
    };
}

function toggleFeedVideo(btn) {
    const video = btn.closest('.feed-item').querySelector('video');
    const icon = btn.querySelector('i');
    if (video.paused) {
        video.play();
        icon.className = 'fas fa-pause';
    } else {
        video.pause();
        icon.className = 'fas fa-play';
    }
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
    const deviceId = 'web-device-' + Math.random().toString(36).substr(2, 9);

    let location = null;
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
        alert("Para usar Verd y ver anuncios más precisos, necesitamos tu ubicación.");
        return;
    }

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, password, deviceId, referralCode, location })
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
        loadNotifications();
    }

    showWindow('free');
}

async function loadNotifications() {
    const list = await apiFetch('/notifications');
    if (!list) return;

    const unread = list.some(n => !n.isRead);
    document.getElementById('notif-badge').style.display = unread ? 'block' : 'none';

    const container = document.getElementById('notif-list');
    if (list.length === 0) {
        container.innerHTML = '<p style="padding:15px; font-size:12px; color:var(--text-muted); text-align:center">No tienes notificaciones</p>';
        return;
    }

    container.innerHTML = list.map(n => `
        <div style="padding:15px; border-bottom:1px solid #111; ${!n.isRead ? 'background:rgba(0,255,127,0.02)' : ''}">
            <div style="font-size:12px; font-weight:bold">${escapeHTML(n.title)}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px">${escapeHTML(n.message)}</div>
            <div style="font-size:9px; color:#444; margin-top:5px">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
    `).join('');
}

function toggleNotifications() {
    const d = document.getElementById('notif-dropdown');
    d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

async function markNotifsRead() {
    await apiFetch('/notifications/read-all', { method: 'POST' });
    loadNotifications();
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
        const ads = await apiFetch('/ads/random/feed') || [];
        main.innerHTML = `
            <div class="feed-container" id="feed-container">
                ${ads.map((ad, idx) => `
                    <div class="feed-item" data-ad-id="${ad._id}">
                        <video class="feed-video" loop playsinline src="${ad.videoUrl ? (ad.videoUrl.startsWith('http') ? ad.videoUrl : `${API_BASE}/${ad.videoUrl}`) : 'https://www.w3schools.com/html/mov_bbb.mp4'}"></video>
                        <div class="feed-overlay">
                            <h3 style="margin:0">${escapeHTML(ad.title)}</h3>
                            <p style="font-size:12px; margin-top:5px; color:#ccc">${escapeHTML(ad.advertiser.username)}</p>
                            ${ad.ctaUrl ? `<button class="btn btn-primary" style="width:auto; padding:10px 20px" onclick="window.open('${ad.ctaUrl}', '_blank')">${escapeHTML(ad.ctaText || 'Saber Más')}</button>` : ''}
                        </div>
                        <div class="feed-actions">
                            <div class="feed-action-btn" onclick="toggleFeedVideo(this)"><i class="fas fa-play"></i></div>
                            <div class="feed-action-btn"><i class="fas fa-heart"></i></div>
                            <div class="feed-action-btn" onclick="showToast('Puntos: +2')"><i class="fas fa-coins" style="color:gold"></i></div>
                        </div>
                        <div class="feed-timer" id="timer-${ad._id}" style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:15px; font-weight:bold; color:var(--primary-green)">15s</div>
                    </div>
                `).join('')}
            </div>
        `;
        initFeedLogic();
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
    } else if (currentWindow === 'leaderboard') {
        renderLeaderboard();
    }
}

async function renderLeaderboard() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<p>Cargando ranking...</p>';

    const topUsers = await apiFetch('/user/leaderboard');
    if (!topUsers) return;

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('free')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Ranking de Usuarios</h2>
            <p style="color:var(--text-muted); font-size:14px">Los mejores de la comunidad Verd</p>
        </div>

        <div style="background:var(--card-bg); border-radius:20px; overflow:hidden; border: 1px solid #222">
            ${topUsers.map((u, i) => `
                <div style="display:flex; align-items:center; padding:15px; border-bottom: 1px solid #222; ${i < 3 ? 'background:rgba(0,255,127,0.05)' : ''}">
                    <div style="width:30px; font-weight:800; color:${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--text-muted)'}">
                        ${i + 1}
                    </div>
                    <div style="width:40px; height:40px; background:#333; border-radius:50%; margin-right:15px; display:flex; align-items:center; justify-content:center; font-weight:bold">
                        ${u.username[0].toUpperCase()}
                    </div>
                    <div style="flex:1">
                        <div style="font-weight:600">${escapeHTML(u.displayName || u.username)}</div>
                        <div style="font-size:11px; color:var(--text-muted)"><i class="fas fa-fire" style="color:orange"></i> ${u.dailyStreak || 0} días de racha</div>
                    </div>
                    <div style="font-weight:bold; color:var(--primary-green)">
                        ${u.points} <i class="fas fa-coins" style="font-size:10px"></i>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function renderAdvertiser() {
    const main = document.getElementById('main-content');
    const myAds = await apiFetch('/advertiser/my-ads') || [];

    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Panel de Anunciantes</h2>
        </div>

        <div style="background:var(--card-bg); padding:20px; border-radius:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; border: 1px solid #333">
            <div>
                <div style="font-size:12px; color:var(--text-muted)">SALDO PUBLICITARIO</div>
                <div style="font-size:24px; font-weight:800; color:var(--primary-green)">$${(userData.advertiserCredits || 0).toFixed(2)} <span style="font-size:12px">USD</span></div>
            </div>
            <button class="btn btn-primary" style="width:auto; padding: 10px 20px" onclick="renderAddCredits()">CARGAR</button>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:20px">
            <button class="btn btn-primary" style="flex:1" onclick="renderCreateAd()">NUEVO ANUNCIO</button>
            <button class="btn" style="flex:1; background:var(--card-bg)" onclick="renderMyAds()">MIS ANUNCIOS</button>
        </div>

        <div id="advertiser-sub-content"></div>
    `;
    renderMyAds();
}

function renderMyAds() {
    const container = document.getElementById('advertiser-sub-content');
    apiFetch('/advertiser/my-ads').then(ads => {
        if (!ads || ads.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No has publicado anuncios aún.</p>';
            return;
        }
        container.innerHTML = ads.map(ad => `
            <div class="config-item" onclick="renderAdStats('${ad._id}')">
                <div class="config-info">
                    <h4>${escapeHTML(ad.title)}</h4>
                    <p>${ad.viewsCompleted} / ${ad.totalViewsOrdered} vistas | <span class="badge badge-${ad.status}">${ad.status}</span></p>
                </div>
                <i class="fas fa-chart-bar"></i>
            </div>
        `).join('');
    });
}

function renderAddCredits() {
    const container = document.getElementById('advertiser-sub-content');
    container.innerHTML = `
        <div class="auth-container" style="min-height:auto; padding:0">
            <h3>Cargar Saldo</h3>
            <p style="font-size:14px; color:var(--text-muted)">Selecciona un paquete para añadir créditos a tu cuenta.</p>

            <div class="config-item" onclick="addCredits(10)" style="cursor:pointer">
                <div class="config-info">
                    <h4>Paquete Básico</h4>
                    <p>2,000 vistas aproximadas</p>
                </div>
                <div style="font-weight:bold">$10.00 USD</div>
            </div>

            <div class="config-item" onclick="addCredits(50)" style="cursor:pointer">
                <div class="config-info">
                    <h4>Paquete Popular</h4>
                    <p>10,000 vistas aproximadas</p>
                </div>
                <div style="font-weight:bold">$50.00 USD</div>
            </div>

            <p style="font-size:12px; color:var(--text-muted); text-align:center; margin-top:20px">
                * Serás redirigido a la pasarela de pago segura.
            </p>
        </div>
    `;
}

async function addCredits(amount) {
    // Demo implementation: instantly add credits
    const res = await apiFetch('/advertiser/add-credits', {
        method: 'POST',
        body: JSON.stringify({ amount })
    });
    if (res) {
        userData.advertiserCredits = res.credits;
        showToast(`$${amount} USD añadidos con éxito (DEMO)`);
        renderAdvertiser();
    }
}

function renderCreateAd() {
    const container = document.getElementById('advertiser-sub-content');
    container.innerHTML = `
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
                <label>Alcance</label>
                <select id="ad-scope" onchange="updateAdScopeFields()">
                    <option value="global">Mundial (Todo el mundo)</option>
                    <option value="national">Nacional (Todo el país)</option>
                    <option value="local">Local (Cercano a mi ubicación)</option>
                </select>
            </div>
            <div id="geo-fields" style="display:none">
                <div class="form-group">
                    <label>País Objetivo</label>
                    <select id="ad-target-country">
                        <option value="Colombia">Colombia</option>
                        <option value="Mexico">México</option>
                        <option value="Argentina">Argentina</option>
                        <option value="USA/Canada">USA/Canada</option>
                        <!-- Add more Latin American countries -->
                    </select>
                </div>
                <div id="map-container" style="height:200px; width:100%; border-radius:10px; margin-bottom:15px; display:none"></div>
                <input type="hidden" id="ad-lat">
                <input type="hidden" id="ad-lng">
            </div>
            <div class="form-group">
                <label>Botón de Acción (Opcional)</label>
                <input type="text" id="ad-cta-text" placeholder="Ej: Visitar Web">
            </div>
            <div class="form-group">
                <label>Enlace del Botón (URL)</label>
                <input type="url" id="ad-cta-url" placeholder="https://tu-sitio.com">
            </div>
            <div class="form-group">
                <label>Cantidad de Vistas</label>
                <input type="number" id="ad-views" value="1000" min="100">
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
        formData.append('scope', document.getElementById('ad-scope').value);
        formData.append('targetCountry', document.getElementById('ad-target-country').value);
        formData.append('lat', document.getElementById('ad-lat').value);
        formData.append('lng', document.getElementById('ad-lng').value);
        formData.append('ctaText', document.getElementById('ad-cta-text').value);
        formData.append('ctaUrl', document.getElementById('ad-cta-url').value);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/advertiser/ads`, {
                method: 'POST',
                headers: { 'x-auth-token': token },
                body: formData
            });

            if (res.ok) {
                showToast('Anuncio enviado a revisión');
                renderAdvertiser();
            } else {
                showToast('Error al subir anuncio');
                btn.disabled = false;
                btn.innerText = 'PUBLICAR ANUNCIO';
            }
        } catch (err) {
            showToast('Error de conexión');
            btn.disabled = false;
        }
    };
}

let createAdMap = null;
function updateAdScopeFields() {
    const scope = document.getElementById('ad-scope').value;
    const geoFields = document.getElementById('geo-fields');
    const mapContainer = document.getElementById('map-container');

    geoFields.style.display = scope === 'global' ? 'none' : 'block';
    mapContainer.style.display = scope === 'local' ? 'block' : 'none';

    if (scope === 'local' && !createAdMap) {
        setTimeout(() => {
            createAdMap = L.map('map-container').setView([4.5709, -74.2973], 5); // Default to LatAm center
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(createAdMap);

            let marker;
            createAdMap.on('click', (e) => {
                if (marker) createAdMap.removeLayer(marker);
                marker = L.marker(e.latlng).addTo(createAdMap);
                document.getElementById('ad-lat').value = e.latlng.lat;
                document.getElementById('ad-lng').value = e.latlng.lng;
            });
        }, 100);
    }
}

async function renderAdStats(adId) {
    const container = document.getElementById('advertiser-sub-content');
    container.innerHTML = '<p>Cargando estadísticas...</p>';

    const data = await apiFetch(`/advertiser/ads/${adId}/stats`);
    if (!data) return;

    container.innerHTML = `
        <button class="btn btn-link" onclick="renderMyAds()" style="padding:0; margin-bottom:10px">
            <i class="fas fa-arrow-left"></i> Volver a mis anuncios
        </button>
        <h3>Rendimiento del Anuncio</h3>
        <div id="stats-map" style="height:300px; width:100%; border-radius:15px; margin-bottom:20px"></div>

        <h4>Resumen por Región</h4>
        <div id="region-stats">
            ${Object.entries(data.stats).map(([region, count]) => `
                <div class="config-item" style="padding:10px">
                    <div class="config-info">
                        <h4 style="font-size:14px">${region}</h4>
                    </div>
                    <div style="font-weight:bold; color:var(--primary-green)">${count} vistas</div>
                </div>
            `).join('')}
        </div>
    `;

    setTimeout(() => {
        const statsMap = L.map('stats-map').setView([10, -80], 3);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(statsMap);

        data.logs.forEach(log => {
            if (log.location && log.location.coordinates) {
                L.circleMarker([log.location.coordinates[1], log.location.coordinates[0]], {
                    radius: 5,
                    fillColor: "#00ff7f",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(statsMap);
            }
        });
    }, 100);
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

        <div style="margin-top:20px; background:var(--card-bg); padding:15px; border-radius:15px; border:1px solid #222">
            <h4 style="margin-top:0">Crecimiento de Usuarios</h4>
            <canvas id="userChart"></canvas>
        </div>
        <div style="margin-top:20px; background:var(--card-bg); padding:15px; border-radius:15px; border:1px solid #222">
            <h4 style="margin-top:0">Vistas Semanales</h4>
            <canvas id="revenueChart"></canvas>
        </div>
    `;
    renderAdminCharts();
}

async function renderAdminCharts() {
    const data = await apiFetch('/admin/analytics');
    if (!data) return;

    const ctxUser = document.getElementById('userChart').getContext('2d');
    new Chart(ctxUser, {
        type: 'line',
        data: {
            labels: data.userGrowth.map(d => d._id),
            datasets: [{
                label: 'Nuevos Usuarios',
                data: data.userGrowth.map(d => d.count),
                borderColor: '#00ff7f',
                tension: 0.4
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    const ctxRev = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctxRev, {
        type: 'bar',
        data: {
            labels: data.viewRevenue.map(d => d._id),
            datasets: [{
                label: 'Vistas Totales',
                data: data.viewRevenue.map(d => d.views),
                backgroundColor: 'rgba(0, 255, 127, 0.5)'
            }]
        }
    });
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
                    <a href="${API_BASE}/${u.kycData.documentImageUrl}" target="_blank" style="color:var(--primary-green); font-size:12px">Ver Documento</a>
                    <a href="${API_BASE}/${u.kycData.selfieImageUrl}" target="_blank" style="color:var(--primary-green); font-size:12px">Ver Selfie</a>
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
                <a href="${API_BASE}/${ad.videoUrl}" target="_blank" style="color:var(--primary-green); font-size:12px; margin-top:10px">Ver Video</a>
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
            <div style="position:relative; width:80px; height:80px; margin:auto; margin-bottom:10px">
                <div style="width:80px; height:80px; background:var(--primary-green); border-radius:50%; display:flex; align-items:center; justify-content:center; color:black; font-size:30px; font-weight:bold;">
                    ${escapeHTML(userData.username[0].toUpperCase())}
                </div>
                <div style="position:absolute; bottom:-5px; right:-5px; background:#111; border:1px solid #333; padding:2px 8px; border-radius:12px; font-size:12px; color:orange; font-weight:bold">
                    <i class="fas fa-fire"></i> ${userData.dailyStreak || 0}
                </div>
            </div>
            <h2 style="margin:0">${escapeHTML(userData.displayName || userData.username)}</h2>
            <p style="color:var(--text-muted); font-size:14px">@${escapeHTML(userData.username)} | ${escapeHTML(userData.email)}</p>
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
                <p>Saldo: $${(userData.advertiserCredits || 0).toFixed(2)} USD</p>
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

        <div class="config-item" onclick="renderEditProfile()">
            <i class="fas fa-user-edit"></i>
            <div class="config-info">
                <h4>Editar Perfil</h4>
                <p>Cambia tu nombre de pantalla</p>
            </div>
            <i class="fas fa-chevron-right" style="font-size:12px; color:#444"></i>
        </div>

        <button class="btn btn-link" onclick="handleLogout()" style="color:var(--danger); margin-top:30px">Cerrar Sesión</button>
    `;
}

function renderEditProfile() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-link" onclick="showWindow('config')" style="padding:0; margin-bottom:10px">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <h2 style="margin:0">Editar Perfil</h2>
        </div>

        <div class="auth-container" style="min-height:auto; padding:0">
            <div class="form-group">
                <label>Nombre de Pantalla</label>
                <input type="text" id="edit-display-name" value="${escapeHTML(userData.displayName || '')}" placeholder="Ej: Juan El Pro">
            </div>
            <button class="btn btn-primary" onclick="updateProfile()">GUARDAR CAMBIOS</button>
        </div>
    `;
}

async function updateProfile() {
    const displayName = document.getElementById('edit-display-name').value;
    const res = await apiFetch('/user/update-profile', {
        method: 'POST',
        body: JSON.stringify({ displayName })
    });
    if (res) {
        userData.displayName = res.displayName;
        showToast('Perfil actualizado');
        showWindow('config');
    }
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

    // Reset CTA
    const oldCta = document.getElementById('video-cta');
    if (oldCta) oldCta.remove();

    // For demo, if no real video URL, use a placeholder
    v.src = ad.videoUrl ? (ad.videoUrl.startsWith('http') ? ad.videoUrl : `${API_BASE}/${ad.videoUrl}`) : 'https://www.w3schools.com/html/mov_bbb.mp4';

    m.style.display = 'flex';
    v.play();

    let t = 15;
    document.getElementById('video-timer').innerText = t + 's';

    const i = setInterval(async () => {
        t--;
        document.getElementById('video-timer').innerText = t + 's';
        if (t <= 0) {
            clearInterval(i);

            if (ad.ctaUrl) {
                const ctaBtn = document.createElement('a');
                ctaBtn.id = 'video-cta';
                ctaBtn.href = ad.ctaUrl;
                ctaBtn.target = '_blank';
                ctaBtn.innerText = ad.ctaText || 'VISITAR WEB';
                ctaBtn.className = 'btn btn-primary';
                ctaBtn.style.position = 'absolute';
                ctaBtn.style.bottom = '20px';
                ctaBtn.style.left = '50%';
                ctaBtn.style.transform = 'translateX(-50%)';
                ctaBtn.style.width = '200px';
                ctaBtn.onclick = () => { m.style.display = 'none'; v.pause(); };
                m.querySelector('.modal-content').appendChild(ctaBtn);

                // Add a close button
                const closeBtn = document.createElement('button');
                closeBtn.innerText = 'Cerrar';
                closeBtn.style.marginTop = '10px';
                closeBtn.onclick = () => { m.style.display = 'none'; v.pause(); };
                // ...
            } else {
                m.style.display = 'none';
                v.pause();
            }

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
