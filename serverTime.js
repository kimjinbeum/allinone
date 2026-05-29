// Server Time Logic

let timeInterval;
let timeOffset = 0; // Difference between local time and server time
let isTracking = false;

// Cloudflare Worker 배포 후 URL 입력 (cloudflare-worker.js 참고)
// 예: 'https://server-time.yourname.workers.dev'
// 미입력 시 아래 공개 프록시로 폴백
const WORKER_URL = 'https://crimson-rice-8eca.pace3583.workers.dev';

async function fetchWithWorker(targetUrl) {
    const url = `${WORKER_URL}?url=${encodeURIComponent(targetUrl)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const requestTime = Date.now();
    const response = await fetch(url, { signal: controller.signal });
    const responseTime = Date.now();
    clearTimeout(timeout);

    const body = await response.json();
    if (body.error) throw new Error(body.error);
    if (!body.date) throw new Error('Date 헤더 없음');

    // Worker 왕복 시간에서 브라우저↔Worker 편도 레이턴시 계산
    const browserLatency = (responseTime - requestTime - (body.workerRoundtripMs || 0)) / 2;
    return { dateHeader: body.date, requestTime, responseTime, extraLatency: browserLatency };
}

// 공개 CORS 프록시 폴백 (Date 헤더 노출 여부에 따라 실패할 수 있음)
const CORS_PROXIES = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://cors.eu.org/${url}`,
    url => `https://cors-anywhere.herokuapp.com/${url}`,
];

async function fetchWithProxy(targetUrl) {
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxyUrl = CORS_PROXIES[i](targetUrl);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);

            const requestTime = Date.now();
            const response = await fetch(proxyUrl, { signal: controller.signal });
            const responseTime = Date.now();
            clearTimeout(timeout);

            const dateHeader = response.headers.get('date');
            if (dateHeader) {
                console.log(`프록시 ${i + 1} 성공:`, dateHeader);
                return { dateHeader, requestTime, responseTime, extraLatency: 0 };
            }
            console.warn(`프록시 ${i + 1}: Date 헤더 없음 (CORS 미노출)`);
        } catch (e) {
            console.warn(`프록시 ${i + 1} 실패:`, e.message);
        }
    }
    throw new Error("모든 프록시에서 Date 헤더를 가져올 수 없습니다.\nCloudflare Worker를 배포하면 안정적으로 동작합니다. (cloudflare-worker.js 참고)");
}

async function fetchServerTimeData(targetUrl) {
    if (WORKER_URL) {
        return fetchWithWorker(targetUrl);
    }
    return fetchWithProxy(targetUrl);
}

async function fetchServerTime() {
    const urlInput = document.getElementById('url-input').value;
    const timeDisplay = document.getElementById('target-server-time');
    const dateDisplay = document.getElementById('target-server-date');
    const descDisplay = document.getElementById('server-time-desc');

    if (!urlInput) {
        alert("URL을 입력해주세요.");
        return;
    }

    let targetUrl = urlInput;
    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    timeDisplay.textContent = "Loading...";
    dateDisplay.textContent = "";
    descDisplay.textContent = "서버에 연결 중...";

    if (timeInterval) {
        clearInterval(timeInterval);
    }

    try {
        const { dateHeader, requestTime, responseTime, extraLatency } = await fetchServerTimeData(targetUrl);

        // Worker 사용 시 extraLatency(브라우저↔Worker 편도)로 보정, 프록시 사용 시 왕복/2
        const latency = WORKER_URL ? extraLatency : (responseTime - requestTime) / 2;
        const serverDate = new Date(dateHeader);
        timeOffset = serverDate.getTime() + latency - Date.now();

        isTracking = true;
        descDisplay.textContent = `[${new URL(targetUrl).hostname}] 서버 시간을 실시간으로 추적합니다.`;
        startClock();
    } catch (error) {
        console.error("Error fetching server time:", error);
        timeDisplay.textContent = "Error";
        dateDisplay.textContent = "";
        descDisplay.textContent = error.message || "시간을 가져올 수 없습니다.";
        isTracking = false;
    }
}

function startClock() {
    updateDisplay();
    timeInterval = setInterval(updateDisplay, 100); // Update every 100ms for responsiveness, though text changes per second
}

let lastCheckedSecond = -1;

function updateDisplay() {
    if (!isTracking) return;

    const timeDisplay = document.getElementById('target-server-time');
    const dateDisplay = document.getElementById('target-server-date');

    const currentServerTime = new Date(Date.now() + timeOffset);

    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    timeDisplay.textContent = currentServerTime.toLocaleTimeString('ko-KR', timeOptions);

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    dateDisplay.textContent = currentServerTime.toLocaleDateString('ko-KR', dateOptions);

    // 초 단위로만 알람 체크 (100ms 인터벌이지만 초가 바뀔 때만)
    const sec = currentServerTime.getSeconds();
    if (sec !== lastCheckedSecond) {
        lastCheckedSecond = sec;
        checkAlarm(currentServerTime);
    }
}

// ==========================================
// Alarm
// ==========================================

let alarmTarget = null;
let alarmFired = false;
let alarmWarned = false;
let toastDismissTimer = null;

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

async function setAlarm() {
    const input = document.getElementById('alarm-time-input').value;
    if (!input) { alert('시간을 입력해주세요.'); return; }

    alarmTarget = input;
    alarmFired = false;
    alarmWarned = false;

    const hasPermission = await requestNotificationPermission();

    const statusEl = document.getElementById('alarm-status');
    const permNote = hasPermission ? '' : ' (브라우저 알림 권한 없음 — 탭 내 팝업만 표시)';
    statusEl.textContent = `🔔 알람 설정됨 → ${alarmTarget}${permNote}`;
    statusEl.style.color = '#5bc0de';

    document.getElementById('alarm-cancel-btn').style.display = 'inline-block';
}

function clearAlarm() {
    alarmTarget = null;
    alarmFired = false;
    alarmWarned = false;

    const statusEl = document.getElementById('alarm-status');
    statusEl.textContent = '';
    document.getElementById('alarm-cancel-btn').style.display = 'none';
    dismissToast();
}

function checkAlarm(serverTime) {
    if (!alarmTarget || alarmFired) return;

    const [ah, am, as_] = alarmTarget.split(':').map(Number);
    const ch = serverTime.getHours();
    const cm = serverTime.getMinutes();
    const cs = serverTime.getSeconds();

    const alarmSec = ah * 3600 + am * 60 + as_;
    const currentSec = ch * 3600 + cm * 60 + cs;
    const diff = alarmSec - currentSec;

    if (diff === 10 && !alarmWarned) {
        alarmWarned = true;
        showToast('⏰ 10초 후 목표 시간!', alarmTarget, 'warning');
    } else if (diff <= 0 && diff > -2 && !alarmFired) {
        alarmFired = true;
        showToast('🔔 시간이 됐습니다!', alarmTarget, 'fired');

        const statusEl = document.getElementById('alarm-status');
        if (statusEl) { statusEl.textContent = `✅ ${alarmTarget} 알람 완료`; statusEl.style.color = '#5cb85c'; }
    }
}

function showToast(message, timeStr, type) {
    // DOM 토스트
    const toast = document.getElementById('alarm-toast');
    document.getElementById('alarm-toast-title').textContent = message;
    document.getElementById('alarm-toast-time').textContent = timeStr;
    toast.className = `alarm-toast alarm-toast-${type} show`;

    if (toastDismissTimer) clearTimeout(toastDismissTimer);
    toastDismissTimer = setTimeout(dismissToast, type === 'fired' ? 15000 : 8000);

    // OS 알림 (다른 탭/창에서도 표시)
    if (Notification.permission === 'granted') {
        new Notification(message, {
            body: `목표 시간: ${timeStr}`,
            icon: 'favicon.ico',
            requireInteraction: type === 'fired', // 'fired'면 클릭 전까지 유지
        });
    }
}

function dismissToast() {
    const toast = document.getElementById('alarm-toast');
    toast.classList.remove('show');
    if (toastDismissTimer) { clearTimeout(toastDismissTimer); toastDismissTimer = null; }
}

// Global local time update for the top bar
function updateLocalTime() {
    const timeDisplay = document.getElementById('server-time-display');
    if (!timeDisplay) return;

    const now = new Date();
    const options = { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false 
    };
    timeDisplay.textContent = now.toLocaleDateString('ko-KR', options);
}

// Initial update and set interval for top bar local time
document.addEventListener('DOMContentLoaded', () => {
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
});
