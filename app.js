const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let painting = false;
let brushSize = document.getElementById('brushSize').value;
let brushColor = document.getElementById('colorPicker').value;
let stabilizationStrength = document.getElementById('stabilizationStrength').value;
let lastX = 0, lastY = 0;
let currentTool = 'pen';
let layers = [];
let currentLayerIndex = 0;
let undoStack = [];
let redoStack = [];

const initializeCanvas = () => {
    const newLayer = document.createElement('canvas');
    newLayer.width = canvas.width;
    newLayer.height = canvas.height;
    newLayer.getContext('2d').fillStyle = 'rgba(0, 0, 0, 0)';
    newLayer.getContext('2d').fillRect(0, 0, newLayer.width, newLayer.height);
    layers.push({ canvas: newLayer, name: `Layer ${layers.length + 1}` });
    updateLayerList();
    saveState();
};

const updateLayerList = () => {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';
    layers.forEach((layer, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = layer.name;
        listItem.appendChild(createLayerNameInput(index));
        listItem.addEventListener('click', () => selectLayer(index));
        if (index === currentLayerIndex) {
            listItem.style.fontWeight = 'bold';
        }
        layerList.appendChild(listItem);
    });
};

const createLayerNameInput = (index) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = layers[index].name;
    input.className = 'layerNameInput';
    input.addEventListener('change', (e) => {
        layers[index].name = e.target.value;
        updateLayerList();
    });
    return input;
};

const selectLayer = (index) => {
    currentLayerIndex = index;
    updateLayerList();
};

const startPosition = (e) => {
    painting = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
};

const endPosition = () => {
    painting = false;
    ctx.beginPath();
    saveState();
};

const draw = (e) => {
    if (!painting || currentTool === 'lasso') return;

    const layerCtx = layers[currentLayerIndex].canvas.getContext('2d');
    layerCtx.lineWidth = brushSize;
    layerCtx.lineCap = 'round';
    layerCtx.strokeStyle = currentTool === 'eraser' ? 'white' : brushColor;

    const newX = e.offsetX;
    const newY = e.offsetY;

    const stabilizationFactor = stabilizationStrength / 10;
    layerCtx.beginPath();
    layerCtx.moveTo(lastX, lastY);
    layerCtx.lineTo(lastX * (1 - stabilizationFactor) + newX * stabilizationFactor, lastY * (1 - stabilizationFactor) + newY * stabilizationFactor);
    layerCtx.stroke();

    [lastX, lastY] = [lastX * (1 - stabilizationFactor) + newX * stabilizationFactor, lastY * (1 - stabilizationFactor) + newY * stabilizationFactor];

    redrawCanvas();
};

const redrawCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach(layer => {
        ctx.drawImage(layer.canvas, 0, 0);
    });
};

const addLayer = () => {
    initializeCanvas();
    selectLayer(layers.length - 1);
};

const deleteLayer = () => {
    if (layers.length > 1) {
        layers.splice(currentLayerIndex, 1);
        currentLayerIndex = Math.max(0, currentLayerIndex - 1);
        updateLayerList();
        redrawCanvas();
        saveState();
    }
};

const saveState = () => {
    const state = layers.map(layer => layer.canvas.toDataURL());
    undoStack.push(state);
    redoStack = [];
};

const undo = () => {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        const state = undoStack[undoStack.length - 1];
        loadState(state);
    }
};

const redo = () => {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        loadState(state);
    }
};

const loadState = (state) => {
    layers.forEach((layer, index) => {
        const img = new Image();
        img.src = state[index];
        img.onload = () => {
            const layerCtx = layer.canvas.getContext('2d');
            layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layerCtx.drawImage(img, 0, 0);
        };
    });
    redrawCanvas();
};

canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);

document.getElementById('colorPicker').addEventListener('change', (e) => {
    brushColor = e.target.value;
});

document.getElementById('brushSize').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('brushSizeInput').value = value;
    brushSize = value;
});

document.getElementById('brushSizeInput').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('brushSize').value = value;
    brushSize = value;
});

document.getElementById('stabilizationStrength').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('stabilizationStrengthInput').value = value;
    stabilizationStrength = value;
});

document.getElementById('stabilizationStrengthInput').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('stabilizationStrength').value = value;
    stabilizationStrength = value;
});

document.getElementById('clearCanvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach(layer => layer.canvas.getContext('2d').clearRect(0, 0, layer.canvas.width, layer.canvas.height));
    saveState();
});

document.getElementById('penButton').addEventListener('click', () => {
    currentTool = 'pen';
});

document.getElementById('eraserButton').addEventListener('click', () => {
    currentTool = 'eraser';
});

document.getElementById('lassoButton').addEventListener('click', () => {
    currentTool = 'lasso';
});

const saveAsPSD = () => {
    const psd = new PSD();

    layers.forEach(layer => {
        const imageData = layer.canvas.getContext('2d').getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        const base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        const binary = atob(base64);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        const byteArray = new Uint8Array(array);

        psd.appendChild({
            top: 0,
            left: 0,
            width: layer.canvas.width,
            height: layer.canvas.height,
            blendMode: 'normal',
            opacity: 255,
            visible: true,
            image: new PSD.Image({
                width: layer.canvas.width,
                height: layer.canvas.height,
                data: byteArray
            })
        });
    });

    const psdBuffer = psd.toFile();
    const blob = new Blob([psdBuffer], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_drawing.psd';
    link.click();
};

document.getElementById('saveButton').addEventListener('click', saveAsPSD);

document.getElementById('addLayer').addEventListener('click', addLayer);
document.getElementById('deleteLayer').addEventListener('click', deleteLayer);
document.getElementById('undoButton').addEventListener('click', undo);
document.getElementById('redoButton').addEventListener('click', redo);

initializeCanvas();
