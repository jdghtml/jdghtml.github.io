// Variables globales
let canvas;
let ctx;
let galleryContainer;
let apiKeyConfig = '';
let inputs;
let textState;
let dragTarget = null;
let selectedImage;

// Cargar lakey.json
async function loadConfig() {
    try {
        const response = await fetch('lakey.json');
        const config = await response.json();
        apiKeyConfig = config.apiKey;
    } catch (error) {
        console.error("Error cargando lakey.json:", error);
    }
}

// Inicializar referencias DOM
function initializeDOM() {
    canvas = document.getElementById('memeCanvas');
    ctx = canvas.getContext('2d');
    galleryContainer = document.getElementById('gallery');
    
    inputs = {
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
    
    selectedImage = new Image();
    selectedImage.crossOrigin = "Anonymous";
    
    textState = {
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
}

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
    } catch (error) { 
        console.error("Error galería", error); 
    }
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

// 3. IA con Groq
async function generateAIContent() {
    const apiKey = apiKeyConfig;
    const topic = document.getElementById('memeTopic').value;

    if (!apiKey || apiKey === 'tu-api-key-aqui') return alert("Falta la API Key en lakey.json. Accede a https://console.groq.com/ para obtenerla (es gratuita).");
    if (!topic) return alert("Escribe un tema.");

    const btn = document.querySelector('.btn-ai');
    const originalText = btn.innerText;
    btn.innerText = "Pensando... 🧠";
    btn.disabled = true;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `Eres un guionista de memes experto en humor absurdo, irónico y de observación cotidiana.
                            
                            Instrucciones:
                            1. Textos MUY CORTOS (máximo 10 palabras por línea).
                            2. Usa juegos de palabras en español, situaciones absurdas pero reconocibles.
                            3. Responde ÚNICAMENTE con un JSON válido.
                            Estilo obligatorio:
                            - Cada meme debe tener: (1) exageración, (2) contraste expectativas vs realidad, (3) un remate inesperado.
                            - Prohibido: clichés sin giro. Si usas un cliché, dale un twist raro.

                            
                            Formato JSON obligatorio: {"topText": "...", "bottomText": "..."}`
                    },
                    {
                        role: "user",
                        content: `Tema del meme: ${topic}`
                    }
                ],
                temperature: 1.25, // ↑ Más creativo/ridículo (era 0.8)
                top_p: 1.0, // ↑ Más diversidad de palabras
                max_tokens: 800, // ↑ Textos más largos
                stream: false
            })
        });

        const data = await response.json();
        if(data.error) throw new Error(data.error.message);

        let rawText = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!rawText) throw new Error("Respuesta inesperada de la IA");
        
        let match = rawText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No se encontró JSON en la respuesta de la IA");
        const memeData = JSON.parse(match[0]);

        inputs.top.text.value = memeData.topText;
        inputs.bottom.text.value = memeData.bottomText;
        updateText('top');
        updateText('bottom');

    } catch (error) {
        console.error("Error IA:", error);
        alert("Error: Revisa la consola (F12) o tu API Key de Groq.");
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

// 5. Compartir y Descargar
async function shareMeme() {
    drawMeme();
    
    canvas.toBlob(async (blob) => {
        const file = new File([blob], "meme-gen-ai.png", { type: "image/png" });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Meme Generator AI',
                    text: '¡Mira este meme que acabo de crear!',
                    files: [file]
                });
            } catch (err) {
                console.log("Compartir cancelado", err);
            }
        } 
        else {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob })
                ]);
                alert("¡Imagen copiada al portapapeles! 📋");
            } catch (err) {
                alert("Tu navegador no soporta compartir imagen directa. Usa el botón 'Guardar'.");
            }
        }
    });
}

function downloadMeme() {
    drawMeme();
    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// 6. Drag & Drop
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
        ctx.font = `bold ${textState[dragTarget].size}px Impact`;
        const metrics = ctx.measureText(textState[dragTarget].text);
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

// Configurar event listeners
function setupEventListeners() {
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
}

// Inicialización
window.addEventListener('DOMContentLoaded', async () => {
    initializeDOM();
    await loadConfig();
    setupEventListeners();
    
    const memeTopicInput = document.getElementById('memeTopic');
    if (memeTopicInput) {
        memeTopicInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                generateAIContent();
            }
        });
    }
    
    fetchTemplates();
});
