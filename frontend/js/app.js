let currentWindow = 'free';
let userPoints = 0;
const API_URL = 'http://localhost:5000/api';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) headers['x-auth-token'] = token;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
        // Handle unauthorized
        return null;
    }
    return res.json();
}

function showWindow(name) {
    currentWindow = name;
    document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-'+name).classList.add('active');
    render();
}

async function render() {
    const main = document.getElementById('main-content');
    if (currentWindow === 'free') {
        const ads = await apiFetch('/ads/free') || [];
        main.innerHTML = '<div class="ad-grid">' +
            ads.map(ad => `<div class="ad-card" onclick="startVideo('${ad._id}')">${ad.title}<br><span style="color:#2ecc71">2 pts</span></div>`).join('') +
            (ads.length === 0 ? '<p>No hay anuncios disponibles.</p>' : '') +
            '</div>';
    } else if (currentWindow === 'random') {
        main.innerHTML = '<div style="text-align:center; padding-top:50px"><button onclick="startVideo()" style="padding:20px; background:#2ecc71; border:none; border-radius:10px">VER RANDOM</button></div>';
    } else {
        main.innerHTML = '<div style="padding:20px"><h2>Configuración</h2><p>Puntos: ' + userPoints + '</p></div>';
    }
}

async function startVideo(adId) {
    if (!adId) {
        const ad = await apiFetch('/ads/random');
        if (!ad) return alert('No hay anuncios');
        adId = ad._id;
    }

    const m = document.getElementById('video-modal');
    m.style.display = 'flex';
    let t = 15;
    const i = setInterval(async () => {
        t--;
        document.getElementById('video-timer').innerText = t + 's';
        if (t <= 0) {
            clearInterval(i);
            m.style.display = 'none';

            const res = await apiFetch(`/ads/complete/${adId}`, { method: 'POST' });
            if (res && res.points !== undefined) {
                userPoints = res.points;
                document.getElementById('user-points').innerText = userPoints;
            }
        }
    }, 1000);
}

showWindow('free');
