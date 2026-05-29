const resultInput = document.getElementById('result');
const historyList = document.getElementById('history-list');
const degRadToggle = document.getElementById('deg-rad-toggle');

// Handwriting UI Elements
const canvas = document.getElementById('handwriting-canvas');
let ctx;
const handwritingArea = document.querySelector('.handwriting-area');
const handwritingToggle = document.getElementById('handwriting-toggle');
const handwritingHeaderTitle = document.querySelector('.handwriting-header h4');

// Graphing UI Elements
const graphCanvas = document.getElementById('graph-canvas');
let chart; // To hold the chart instance

let isRadian = true;
let memory = 0;

// -- Initialization for Calculator --
function initCalculator() {
    if (!resultInput) return;

    loadHistory();

    if(handwritingArea) {
        handwritingArea.classList.add('collapsed');
        if(canvas) {
            ctx = canvas.getContext('2d');
            initCanvas();
        }
        
        if(handwritingToggle) {
            handwritingToggle.addEventListener('click', () => {
                handwritingArea.classList.toggle('collapsed');
            });
        }
        if(handwritingHeaderTitle) {
            handwritingHeaderTitle.textContent = "손글씨";
        }
    }
    
    if(canvas) {
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if(degRadToggle) {
        degRadToggle.addEventListener('click', () => {
            isRadian = !isRadian;
            degRadToggle.textContent = isRadian ? 'RAD' : 'DEG';
        });
    }
    
    // -- Keyboard Input --
    document.addEventListener('keydown', function(event) {
        const calcTab = document.getElementById('calculator-menu');
        if(!calcTab || calcTab.style.display === 'none') return;
        
        if(!resultInput) return;

        if (document.activeElement.id === 'func-input') return;

        const key = event.key;
        if (/^[0-9.]$/.test(key)) appendNumber(key);
        else if (['+', '-', '*', '/', '(', ')', '^'].includes(key)) appendOperator(key);
        else if (key === 'Enter' || key === '=') { event.preventDefault(); evaluateExpression(); }
        else if (key === 'Backspace') deleteChar();
        else if (key === 'Escape') clearDisplay();
    });
}

// -- Core Calculator Functions --
function appendNumber(number) { if(resultInput) resultInput.value += number; }
function appendOperator(operator) { if(resultInput) resultInput.value += operator; }
function clearDisplay() { if(resultInput) resultInput.value = ''; }
function deleteChar() { if(resultInput) resultInput.value = resultInput.value.slice(0, -1); }

function evaluateExpression() {
    if(!resultInput) return;
    try {
        const expression = resultInput.value;
        const result = math.evaluate(expression);
        resultInput.value = result;
        addToHistory(expression, result);
    } catch (error) {
        resultInput.value = 'Error';
    }
}

function calculate(fn) {
    if(!resultInput) return;
    const value = parseFloat(resultInput.value);
    let result;
    let expression;

    if (fn === 'pi') { resultInput.value += Math.PI; return; }
    if (fn === 'e') { resultInput.value += Math.E; return; }
    if (fn === 'pow') { resultInput.value += '^'; return; }

    if (isNaN(value) && resultInput.value !== '') { resultInput.value = 'Error'; return; }

    const angle = isRadian ? value : math.unit(value, 'deg').to('rad').value;

    switch (fn) {
        case 'sin': result = Math.sin(angle); expression = `sin(${value})`; break;
        case 'cos': result = Math.cos(angle); expression = `cos(${value})`; break;
        case 'tan': result = Math.tan(angle); expression = `tan(${value})`; break;
        case 'asin': result = Math.asin(value); if (!isRadian) result = math.unit(result, 'rad').to('deg').value; expression = `asin(${value})`; break;
        case 'acos': result = Math.acos(value); if (!isRadian) result = math.unit(result, 'rad').to('deg').value; expression = `acos(${value})`; break;
        case 'atan': result = Math.atan(value); if (!isRadian) result = math.unit(result, 'rad').to('deg').value; expression = `atan(${value})`; break;
        case 'log': result = Math.log10(value); expression = `log(${value})`; break;
        case 'ln': result = Math.log(value); expression = `ln(${value})`; break;
        case 'sqrt': result = Math.sqrt(value); expression = `sqrt(${value})`; break;
        case 'exp': result = Math.exp(value); expression = `exp(${value})`; break;
        default: result = 'Error';
    }

    if (result !== undefined) {
        resultInput.value = result;
        addToHistory(expression, result);
    }
}

// -- History Management --
function addToHistory(expression, result) {
    const history = getHistory();
    history.push({ expression, result });
    localStorage.setItem('calculatorHistory', JSON.stringify(history));
    renderHistory();
}
function getHistory() { return JSON.parse(localStorage.getItem('calculatorHistory')) || []; }

function renderHistory() {
    if(!historyList) return;
    historyList.innerHTML = '';
    const history = getHistory();
    history.forEach((item, index) => {
        const li = document.createElement('li');
        
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `${item.expression} = <b>${item.result}</b>`;
        textSpan.style.flex = "1";
        textSpan.addEventListener('click', () => {
            if(resultInput) resultInput.value = item.result;
        });

        const delBtn = document.createElement('span');
        delBtn.textContent = '✖';
        delBtn.className = 'history-del-btn';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(index);
        });

        li.appendChild(textSpan);
        li.appendChild(delBtn);
        historyList.appendChild(li);
    });
    historyList.scrollTop = historyList.scrollHeight;
}

function deleteHistoryItem(index) {
    const history = getHistory();
    history.splice(index, 1);
    localStorage.setItem('calculatorHistory', JSON.stringify(history));
    renderHistory();
}

function loadHistory() { renderHistory(); }
function clearHistory() { localStorage.removeItem('calculatorHistory'); renderHistory(); }

// -- Memory Functions --
function memoryClear() { memory = 0; }
function memoryRecall() { if(resultInput) resultInput.value = memory; }
function memoryAdd() { if(resultInput) { try { memory += math.evaluate(resultInput.value || '0'); } catch (e) { resultInput.value = "Error"; } } }
function memorySubtract() { if(resultInput) { try { memory -= math.evaluate(resultInput.value || '0'); } catch (e) { resultInput.value = "Error"; } } }


// ==========================================
// Handwriting Recognition (Tesseract.js)
// ==========================================

let isDrawing = false;

function initCanvas() {
    if(!ctx || !canvas) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}

function clearCanvas() {
    if(!ctx || !canvas) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function handleMouseDown(e) {
    if (e.button === 0) startDrawing(e);
    else if (e.button === 2) recognizeDigit();
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function handleTouchStart(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function handleTouchMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
    }
}

function showCandidates(candidates) {
    document.getElementById('candidates')?.remove();

    const div = document.createElement('div');
    div.id = 'candidates';
    div.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-top: 8px;
    `;

    candidates.forEach((digit) => {
        const btn = document.createElement('button');
        btn.textContent = digit;
        btn.style.cssText = `
            padding: 6px 14px;
            font-size: 1.1rem;
            border-radius: 6px;
            border: 1px solid #aaa;
            cursor: pointer;
            background: #f0f0f0;
        `;
        btn.onclick = () => {
            appendNumber(digit);
            div.remove();
            if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "손글씨";
        };
        div.appendChild(btn);
    });

    if(handwritingArea) handwritingArea.appendChild(div);
}

async function recognizeDigit() {
    if(!ctx || !canvas) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((v, i) => i % 4 === 0 && v > 30);
    if (!hasContent) return;

    document.getElementById('candidates')?.remove();
    if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "인식 중...";

    try {
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789',
            tessedit_pageseg_mode: '10',
        });
        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();

        const matches = [...new Set(text.trim().replace(/\s/g, '').split('').filter(c => /[0-9]/.test(c)))];

        clearCanvas();

        if (matches.length === 0) {
            if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "다시 써주세요";
            setTimeout(() => { if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "손글씨"; }, 1500);
            return;
        }

        if (matches.length === 1) {
            appendNumber(matches[0]);
            if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "손글씨";
        } else {
            if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "선택하세요";
            showCandidates(matches.slice(0, 3));
        }

    } catch (e) {
        console.error("인식 오류:", e);
        if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "오류 발생";
        setTimeout(() => { if(handwritingHeaderTitle) handwritingHeaderTitle.textContent = "손글씨"; }, 1500);
    }
}

// ==========================================
// Graphing Calculator Logic
// ==========================================

function plotGraph() {
    const funcInput = document.getElementById('func-input').value;
    const xMin = parseFloat(document.getElementById('x-min').value);
    const xMax = parseFloat(document.getElementById('x-max').value);

    if (!funcInput) {
        alert("함수 f(x)를 입력해주세요.");
        return;
    }
    if (isNaN(xMin) || isNaN(xMax)) {
        alert("X의 범위는 숫자로 입력해야 합니다.");
        return;
    }

    try {
        const node = math.parse(funcInput);
        const code = node.compile();

        const labels = [];
        const data = [];
        const step = (xMax - xMin) / 200;

        for (let x = xMin; x <= xMax; x += step) {
            labels.push(x.toFixed(2));
            data.push(code.evaluate({ x: x }));
        }

        const graphCtx = graphCanvas.getContext('2d');
        if (chart) {
            chart.destroy();
        }
        chart = new Chart(graphCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `f(x) = ${funcInput}`,
                    data: data,
                    borderColor: '#3e95cd',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'x' } },
                    y: { title: { display: true, text: 'f(x)' } }
                }
            }
        });

    } catch (err) {
        alert("함수식이 올바르지 않습니다: " + err.message);
    }
}

function downloadGraphPDF() {
    const funcInput = document.getElementById('func-input').value;
    if (!chart || !funcInput) {
        alert("먼저 그래프를 생성해주세요.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const graphArea = document.getElementById('graph-export-area');
    
    html2canvas(graphArea, {
        backgroundColor: '#ffffff',
        scale: 2
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFontSize(20);
        pdf.text(`Graph of f(x) = ${funcInput}`, pdfWidth / 2, 40, { align: 'center' });

        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        const yPos = (pdfHeight - imgHeight) / 2;
        pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, imgHeight);

        pdf.save(`graph-${funcInput.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    });
}
