function initCharCounter() {
    const textarea = document.getElementById('char-counter-textarea');
    if (!textarea) return;

    const charCount = document.getElementById('char-count');
    const byteCount = document.getElementById('byte-count');
    const wordCount = document.getElementById('word-count');
    const lineCount = document.getElementById('line-count');
    const clearBtn = document.getElementById('clear-char-counter');

    function count() {
        const text = textarea.value;
        
        // 글자 수 (공백 포함/제외)
        const chars = text.length;
        const charsNoSpace = text.replace(/\s/g, '').length;
        charCount.textContent = `${chars} (공백 제외: ${charsNoSpace})`;

        // 바이트 수
        let bytes = 0;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            if (code < 0x80) { // ASCII
                bytes += 1;
            } else if (code < 0x800) { // 2-byte
                bytes += 2;
            } else { // 3-byte (or more for supplementary)
                bytes += 3;
            }
        }
        byteCount.textContent = bytes;

        // 단어 수
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordCount.textContent = words;

        // 줄 수
        const lines = text.split('\n').length;
        lineCount.textContent = lines;
    }

    textarea.addEventListener('input', count);

    clearBtn.addEventListener('click', () => {
        textarea.value = '';
        count();
    });

    // Initial count
    count();
}
