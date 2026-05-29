function initServerTime() {
    const urlInput = document.getElementById('url-input');
    if (!urlInput) return;

    const timeDisplay = document.getElementById('target-server-time');
    const dateDisplay = document.getElementById('target-server-date');
    const descDisplay = document.getElementById('server-time-desc');
    const fetchButton = document.querySelector('.url-input-group .btn');
    const alarmCancelBtn = document.getElementById('alarm-cancel-btn');
    const alarmStatus = document.getElementById('alarm-status');

    let timeInterval;
    let timeOffset = 0;
    let isTracking = false;
    let lastCheckedSecond = -1;

    // Alarm state
    let alarmTarget = null;
    let alarmFired = false;
    let alarmWarned = false;
    let toastDismissTimer = null;

    const WORKER_URL = 'https://crimson-rice-8eca.pace3583.workers.dev';

    // ==========================================
    // Server Time
    // ==========================================

    async function fetchServerTimeData(targetUrl) {
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

        const browserLatency = (responseTime - requestTime - (body.workerRoundtripMs || 0)) / 2;
        return { dateHeader: body.date, requestTime, responseTime, extraLatency: browserLatency };
    }

    async function fetchTime() {
        const urlValue = urlInput.value;
        if (!urlValue) { alert("URL을 입력해주세요."); return; }

        let targetUrl = urlValue;
        if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'http://' + targetUrl;

        timeDisplay.textContent = "Loading...";
        dateDisplay.textContent = "";
        descDisplay.textContent = "서버에 연결 중...";

        if (timeInterval) clearInterval(timeInterval);

        try {
            const { dateHeader, requestTime, responseTime, extraLatency } = await fetchServerTimeData(targetUrl);
            const browserLatency = extraLatency;
            const serverDate = new Date(dateHeader);
            timeOffset = serverDate.getTime() + browserLatency - Date.now();
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
        timeInterval = setInterval(updateDisplay, 100);
    }

    function updateDisplay() {
        if (!isTracking) return;
        const now = new Date(Date.now() + timeOffset);
        timeDisplay.textContent = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        dateDisplay.textContent = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

        const sec = now.getSeconds();
        if (sec !== lastCheckedSecond) {
            lastCheckedSecond = sec;
            checkAlarm(now);
        }
    }

    // ==========================================
    // Alarm
    // ==========================================

    async function setAlarm() {
        const input = document.getElementById('alarm-time-input').value;
        if (!input) { alert('시간을 입력해주세요.'); return; }

        alarmTarget = input;
        alarmFired = false;
        alarmWarned = false;

        let hasPermission = false;
        if ('Notification' in window) {
            if (Notification.permission === 'granted') hasPermission = true;
            else if (Notification.permission !== 'denied') {
                hasPermission = (await Notification.requestPermission()) === 'granted';
            }
        }

        const permNote = hasPermission ? '' : ' (브라우저 알림 권한 없음 — 탭 내 팝업만 표시)';
        alarmStatus.textContent = `🔔 알람 설정됨 → ${alarmTarget}${permNote}`;
        alarmStatus.style.color = '#5bc0de';
        alarmCancelBtn.style.display = 'inline-block';
    }

    function clearAlarm() {
        alarmTarget = null;
        alarmFired = false;
        alarmWarned = false;
        alarmStatus.textContent = '';
        alarmCancelBtn.style.display = 'none';
        dismissToast();
    }

    function checkAlarm(serverTime) {
        if (!alarmTarget || alarmFired) return;
        const [ah, am, as_] = alarmTarget.split(':').map(Number);
        const alarmSec = ah * 3600 + am * 60 + as_;
        const currentSec = serverTime.getHours() * 3600 + serverTime.getMinutes() * 60 + serverTime.getSeconds();
        const diff = alarmSec - currentSec;

        if (diff === 10 && !alarmWarned) {
            alarmWarned = true;
            showToast('⏰ 10초 후 목표 시간!', alarmTarget, 'warning');
        } else if (diff <= 0 && diff > -2 && !alarmFired) {
            alarmFired = true;
            showToast('🔔 시간이 됐습니다!', alarmTarget, 'fired');
            alarmStatus.textContent = `✅ ${alarmTarget} 알람 완료`;
            alarmStatus.style.color = '#5cb85c';
        }
    }

    function showToast(message, timeStr, type) {
        const toast = document.getElementById('alarm-toast');
        document.getElementById('alarm-toast-title').textContent = message;
        document.getElementById('alarm-toast-time').textContent = timeStr;
        toast.className = `alarm-toast alarm-toast-${type} show`;

        if (toastDismissTimer) clearTimeout(toastDismissTimer);
        toastDismissTimer = setTimeout(dismissToast, type === 'fired' ? 15000 : 8000);

        if (Notification.permission === 'granted') {
            new Notification(message, {
                body: `목표 시간: ${timeStr}`,
                icon: 'favicon.ico',
                requireInteraction: type === 'fired',
            });
        }
    }

    function dismissToast() {
        document.getElementById('alarm-toast').classList.remove('show');
        if (toastDismissTimer) { clearTimeout(toastDismissTimer); toastDismissTimer = null; }
    }

    // ==========================================
    // Event Listeners
    // ==========================================

    fetchButton.addEventListener('click', fetchTime);
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchTime(); });

    const alarmSetBtn = document.querySelector('#alarm-time-input + .btn');
    if (alarmSetBtn) alarmSetBtn.addEventListener('click', setAlarm);
    if (alarmCancelBtn) alarmCancelBtn.addEventListener('click', clearAlarm);

    const toastClose = document.querySelector('.alarm-toast-close');
    if (toastClose) toastClose.addEventListener('click', dismissToast);
}