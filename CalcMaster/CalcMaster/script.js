const resultInput = document.getElementById('result');

function appendNumber(number) {
    resultInput.value += number;
}

function appendOperator(operator) {
    resultInput.value += operator;
}

function clearDisplay() {
    resultInput.value = '';
}

function deleteChar() {
    resultInput.value = resultInput.value.slice(0, -1);
}

function evaluateExpression() {
    try {
        // Replace ^ with ** for power calculation before evaluating
        let expression = resultInput.value.replace(/\^/g, '**');
        const result = eval(expression);
        resultInput.value = result;
    } catch (error) {
        resultInput.value = 'Error';
    }
}

function calculate(fn) {
    const value = parseFloat(resultInput.value);
    
    // Pi and e can be added without a preceding number
    if (fn === 'pi') {
        resultInput.value += Math.PI;
        return;
    }
    if (fn === 'e') {
        resultInput.value += Math.E;
        return;
    }

    if (isNaN(value) && resultInput.value !== '') {
        resultInput.value = 'Error';
        return;
    }

    let result;
    switch (fn) {
        case 'sin':
            result = Math.sin(value);
            break;
        case 'cos':
            result = Math.cos(value);
            break;
        case 'tan':
            result = Math.tan(value);
            break;
        case 'asin':
            result = Math.asin(value);
            break;
        case 'acos':
            result = Math.acos(value);
            break;
        case 'atan':
            result = Math.atan(value);
            break;
        case 'log':
            result = Math.log10(value);
            break;
        case 'ln':
            result = Math.log(value);
            break;
        case 'sqrt':
            result = Math.sqrt(value);
            break;
        case 'pow':
            resultInput.value += '^';
            return;
        case 'exp':
            result = Math.exp(value);
            break;
        default:
            result = 'Error';
    }
    
    if (result !== undefined) {
         resultInput.value = result;
    }
}