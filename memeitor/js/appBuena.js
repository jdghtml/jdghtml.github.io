const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const galleryContainer = document.getElementById('gallery');

// Referencias DOM
const inputs = {
    top: {
        text: document.getElementById('topTextInput'),
        color: document.getElementById('topColor'),
        size: document.getElementById('topSize')
    },
    bottom: {
        text: document.getElementById('bottomTextInput'),
        color: document.getElementById('bottomColor'),
        size: document.getElementById('bottomSize')
    }
};

let selectedImage = new Image();
selectedImage.crossOrigin = "Anonymous";

// --- ESTADO GLOBAL ---
let textState = {
    top: { 
        text: "", 
        x: 400, y: 60, 
        size: 60, color: "#FFFFFF",
        isDragging: false, offset: {x:0, y:0} 
    },
    bottom: { 
        text: "", 
        x: 400, y: 740, 
        size: 60, color: "#FFFFFF",
        isDragging: false, offset: {x:0, y:0} 
    }
};
let dragTarget = null; 

// 1. Cargar Plantillas
async function fetchTemplates() {
    try {
        const response = await fetch('https://api.imgflip.com/get_memes');
        const data = await response.json();
        const memes = data.data.memes;
        
        memes.forEach(meme => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${meme.url}" alt="${meme.name}" loading="lazy">`;
            div.onclick = () => selectTemplate(meme.url);
            galleryContainer.appendChild(div);
        });
        selectTemplate(memes[0].url);
    } catch (error) { console.error("Error galería", error); }
}

function selectTemplate(url) {
    selectedImage.src = url;
    textState.top.x = canvas.width / 2;
    textState.top.y = 60;
    textState.bottom.x = canvas.width / 2;
    textState.bottom.y = canvas.height - 60;
    selectedImage.onload = () => drawMeme();
}

// 2. Control de Inputs
function updateText(pos) {
    textState[pos].text = inputs[pos].text.value.toUpperCase();
    drawMeme();
}

function updateStyle(pos) {
    textState[pos].color = inputs[pos].color.value;
    textState[pos].size = parseInt(inputs[pos].size.value);
    drawMeme();
}

// 3. IA con Gemini
async function generateAIContent() {
    const apiKey = document.getElementById('apiKey').value;
    const topic = document.getElementById('memeTopic').value;

    if (!apiKey) return alert("Falta la API Key de Gemini.");
    if (!topic) return alert("Escribe un tema.");

    const btn = document.querySelector('.btn-ai');
    const originalText = btn.innerText;
    btn.innerText = "Pensando... 🧠";
    btn.disabled = true;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Eres un generador de memes. Tema: "${topic}". Responde SOLO JSON: {"topText": "...", "bottomText": "..."}`
                    }]
                }]
            })
        });

        const data = await response.json();
        if(data.error) throw new Error(data.error.message);

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const memeData = JSON.parse(cleanJson);

        inputs.top.text.value = memeData.topText;
        inputs.bottom.text.value = memeData.bottomText;
        updateText('top');
        updateText('bottom');

    } catch (error) {
        console.error("Error IA:", error);
        alert("Error: Revisa la consola (F12) o tu API Key.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 4. Dibujar en Canvas
function drawMeme() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const ratio = Math.min(canvas.width / selectedImage.width, canvas.height / selectedImage.height);
    const cx = (canvas.width - selectedImage.width * ratio) / 2;
    const cy = (canvas.height - selectedImage.height * ratio) / 2;
    ctx.drawImage(selectedImage, 0, 0, selectedImage.width, selectedImage.height, cx, cy, selectedImage.width * ratio, selectedImage.height * ratio);

    drawTextObject(textState.top);
    drawTextObject(textState.bottom);
}

function drawTextObject(obj) {
    if(!obj.text) return;
    
    ctx.fillStyle = obj.color;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = obj.size / 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; 
    ctx.font = `bold ${obj.size}px Impact`;

    ctx.strokeText(obj.text, obj.x, obj.y);
    ctx.fillText(obj.text, obj.x, obj.y);
}

// --- FUNCIONALIDAD COMPARTIR (NUEVO) ---
async function shareMeme() {
    drawMeme(); // Asegurar renderizado
    
    // 1. Convertir Canvas a Blob (Archivo en memoria)
    canvas.toBlob(async (blob) => {
        const file = new File([blob], "meme-gen-ai.png", { type: "image/png" });
        
        // 2. Intentar API Nativa (Móviles / Tablets)
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Meme Generator AI',
                    text: '¡Mira este meme que acabo de crear!',
                    files: [file]
                });
            } catch (err) {
                console.log("Compartir cancelado o fallido", err);
            }
        } 
        // 3. Fallback: Portapapeles (Desktop)
        else {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob })
                ]);
                alert("¡Imagen copiada al portapapeles! 📋\nAhora puedes pegarla en WhatsApp Web, Discord, etc.");
            } catch (err) {
                alert("Tu navegador no soporta compartir imagen directa. Usa el botón 'Guardar'.");
            }
        }
    });
}

// Descarga
function downloadMeme() {
    drawMeme();
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// --- DRAG & DROP ---
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function isHit(obj, mousePos) {
    if (!obj.text) return false;
    ctx.font = `bold ${obj.size}px Impact`;
    const metrics = ctx.measureText(obj.text);
    const width = metrics.width;
    const height = obj.size; 
    
    return (mousePos.x >= obj.x - width/2 && mousePos.x <= obj.x + width/2 &&
            mousePos.y >= obj.y - height/2 && mousePos.y <= obj.y + height/2);
}

function handleStart(e) {
    if(e.touches) e.preventDefault();
    const m = getMousePos(e);

    if (isHit(textState.top, m)) dragTarget = 'top';
    else if (isHit(textState.bottom, m)) dragTarget = 'bottom';

    if (dragTarget) {
        textState[dragTarget].isDragging = true;
        // Recalcular el offset considerando el tamaño actual del texto
        ctx.font = `bold ${textState[dragTarget].size}px Impact`;
        const metrics = ctx.measureText(textState[dragTarget].text);
        const width = metrics.width;
        const height = textState[dragTarget].size;
        // El offset es relativo al centro del texto
        textState[dragTarget].offset.x = m.x - textState[dragTarget].x;
        textState[dragTarget].offset.y = m.y - textState[dragTarget].y;
    }
}

function handleMove(e) {
    if (!dragTarget) return;
    if(e.touches) e.preventDefault();
    const m = getMousePos(e);
    
    if (textState[dragTarget].isDragging) {
        textState[dragTarget].x = m.x - textState[dragTarget].offset.x;
        textState[dragTarget].y = m.y - textState[dragTarget].offset.y;
        drawMeme();
    }
}

function handleEnd() {
    if (dragTarget) {
        textState[dragTarget].isDragging = false;
        dragTarget = null;
    }
}

// Listeners
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);

// Init
fetchTemplates();
