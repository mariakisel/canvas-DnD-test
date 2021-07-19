(() => {

    const canvas = getElement("canvas");
    canvas.onmousedown = mouseDown;
    canvas.onmouseup = mouseUp;
    canvas.onmousemove = mouseMove;
    const ctx = canvas.getContext("2d");

    const relativeOffsets = canvas.getBoundingClientRect();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const backgroundCanvas = getElement("backgroundCanvas");
    backgroundCanvas.width = window.innerWidth;
    backgroundCanvas.height = window.innerHeight;

    backgroundCanvas.onmouseup = backgroundMouseUp;
    backgroundCanvas.onmousemove = backgroundMouseMove;
    const backgroundCtx = backgroundCanvas.getContext("2d");

    const backgroundRelativeOffsets = backgroundCanvas.getBoundingClientRect();
    const backgroundOffsetX = backgroundRelativeOffsets.left;
    const backgroundOffsetY = backgroundRelativeOffsets.top;

    const zoneSeparatorX = canvasWidth / 4;

    const deleteKeyCode = 46;
   
    let isDragging = false;
    let draggingShape = null;
    const dragStartCoords = {x: null, y: null};   

    let choosenShape = null;
    let isOutOfBorder = false;

    const defaultShapes = [
        {id: 'defaultRectangle', type: 'rectangle', x: 30, y: 100, width: 60, height: 60, fill: "#228533"},
        {id: 'defaultCircle', type: 'circle', x: 60, y: 200, r: 30, fill: "#2f34d0"}
    ];

    window.addEventListener("keydown", onKeyDown, false);

    function onKeyDown(event) {        
        if (choosenShape && event.keyCode === deleteKeyCode) {
            deleteShape(choosenShape.id);       
            drawDndZone();
        }
    }

    function mouseDown(event) {
        choosenShape = null;
        
        const clickCoords = {
            x: parseInt(event.clientX  - relativeOffsets.left), 
            y: parseInt(event.clientY - relativeOffsets.top) 
        }
        
        isDragging = false;

        const shapes = loadShapes();

        for (let shape of shapes) {   
            if (shape.type === 'rectangle' && isClickInRectangle(clickCoords, shape)) {
                onShapeClicked(shape, clickCoords);
            } 
            else if (shape.type === 'circle' && isClickInCircle(clickCoords, shape)) {
                onShapeClicked(shape, clickCoords);
            } 
        }
              
        if (draggingShape) {
            if (clickCoords.x <= zoneSeparatorX) {
                shapes.push(draggingShape);
            }           
                        
            if (event.which === 1) {
                ctx.globalCompositeOperation = "source-over";   
            }

            dragStartCoords.x = clickCoords.x;
            dragStartCoords.y = clickCoords.y;            
        }

        updateShapes(shapes);
        drawDndZone();  
    }

    function backgroundMouseMove(event) {        
        if (draggingShape) {
            isOutOfBorder = true;

            deleteShape(draggingShape.id);
            drawDndZone();

            drawBackground();
                
            const mouseCoords = {
                x: parseInt(event.clientX - backgroundOffsetX), 
                y: parseInt(event.clientY - backgroundOffsetY) 
            }

            const distance = {
                x: mouseCoords.x - dragStartCoords.x,
                y: mouseCoords.y - dragStartCoords.y
            };

            draggingShape.x += distance.x;
            draggingShape.y += distance.y;

            drawBackground();
            
            dragStartCoords.x = mouseCoords.x;
            dragStartCoords.y = mouseCoords.y;
        }
    }

    function onShapeClicked(shape, clickCoords) {
        isDragging = true;

        if (clickCoords.x <= zoneSeparatorX) {
            draggingShape = {...shape};
            draggingShape.id = uuidv4();
            choosenShape = draggingShape;
        }
        else {            
            draggingShape = shape;
            choosenShape = draggingShape;
        }
    }

    function isClickInRectangle(clickCoords, shape) {
        return clickCoords.x > shape.x 
            && clickCoords.x < shape.x + shape.width 
            && clickCoords.y > shape.y 
            && clickCoords.y < shape.y + shape.height;
    }

    function isClickInCircle(clickCoords, shape) {
        const dx = shape.x-clickCoords.x;
        const dy = shape.y-clickCoords.y;

        return dx * dx + dy * dy < shape.r * shape.r;
    }

    function mouseUp() {
        if (isOutOfBorder && draggingShape) {
            draggingShape = null;
            isDragging = false;

            drawDndZone();
        }

        if (isDragging) {
            deleteShapeFromSelectionZone();
        }

        isDragging = false;
        draggingShape = null;
    }

    function backgroundMouseUp() {
        if (draggingShape) {
            draggingShape = null;
            isDragging = false;
            drawBackground();
        }
    }

    function deleteShapeFromSelectionZone() {
        if (draggingShape.x < zoneSeparatorX) {
            deleteShape(draggingShape.id);
            drawDndZone();
        }
    }

    function deleteShape(id) {
        const filteredShapes = loadShapes().filter(function(shape) {
            return shape.id != id;
        });

        updateShapes(filteredShapes);         
    }

    function mouseMove(event) {
        if (isOutOfBorder && draggingShape) {
            const shapes = loadShapes();
            shapes.push(draggingShape);
            updateShapes(shapes);

            clearBackground();
            isOutOfBorder = false;
            isDragging = true;
        }

        if (isDragging) {
            drawDndZone(); 

            const mouseCoords = {
                x: parseInt(event.clientX  - relativeOffsets.left), 
                y: parseInt(event.clientY - relativeOffsets.top) 
            }
        
            const distance = {
                x: mouseCoords.x - dragStartCoords.x,
                y: mouseCoords.y - dragStartCoords.y
            };

            if (isInCanvasZone(draggingShape)) {
                if (canShapeMove(draggingShape, distance)) {
                    moveShape(distance);
                }
            } 
            else {
                moveShape(distance);
            }

            drawDndZone();
        
            dragStartCoords.x = mouseCoords.x;
            dragStartCoords.y = mouseCoords.y;
        }
    }

    function isInCanvasZone(shape) {
        return shape.x >= zoneSeparatorX;
    }

    function canShapeMove(shape, distance) {
        if (shape.type === 'rectangle') {
            return  canvas.width >= shape.x + shape.width + distance.x
                && 0 <= shape.y + distance.y
                && canvas.height >= shape.y + shape.height + distance.y;
        } 
        else if (shape.type === 'circle') {            
            return canvas.width >= shape.x + shape.r + distance.x
                && 0 <= shape.y - shape.r + distance.y
                && canvas.height >= shape.y + shape.r + distance.y;
        } 
        else {
            return true;
        }
    }

    function moveShape(distance) {
        draggingShape.x += distance.x;
        draggingShape.y += distance.y;

        const shapes = loadShapes();

        shapes.forEach(function(el) {
            if (el.id === draggingShape.id) {
                el.x += distance.x;
                el.y += distance.y;
            }
        });

        updateShapes(shapes);
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
           return v.toString(16);
        });
    }
    
    function drawDndZone() {
        clearDndZone(); 
        drawZoneSeparator(ctx); 
        drawHeader(backgroundCtx);   
        
        const shapes = loadShapes();
        
        for (let shape of shapes) {          
            if (shape.type === 'rectangle') {
                drawRectangle(ctx, shape);
            }
            else {
                drawCircle(ctx, shape);
            }
        }
    }

    function clearDndZone() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    function drawBackground() {        
        clearBackground();
        drawHeader(backgroundCtx);
                
        if (draggingShape) {
            if (draggingShape.type === 'rectangle') {
                drawRectangle(backgroundCtx, draggingShape);
            }
            else {
                drawCircle(backgroundCtx, draggingShape);
            }
        }
    }

    function clearBackground() {
        backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    }
    
    function drawHeader(context) {        
        context.beginPath(); 
        context.font = "14px Arial black";
        context.strokeStyle = 'black';
        context.fillStyle = "#e6e6e6";
        context.rect(relativeOffsets.x, relativeOffsets.y - 50, zoneSeparatorX, 50);
        context.rect(relativeOffsets.x + zoneSeparatorX, relativeOffsets.y - 50, canvasWidth - zoneSeparatorX, 50);
        context.fill();
        context.fillStyle = 'black';
        context.fillText("Figures", relativeOffsets.x + 30, relativeOffsets.y - 20); 
        context.fillText("Canvas", relativeOffsets.x + zoneSeparatorX + 150, relativeOffsets.y - 20);                
        context.stroke();
        context.closePath();
    } 
   
    function drawZoneSeparator(context) {  
        context.beginPath();  
        context.moveTo(zoneSeparatorX, 0);
        context.lineTo(zoneSeparatorX, canvasWidth);
        context.strokeStyle = "black";
        context.stroke();
        context.closePath();
    }

    function drawRectangle(context, shape) {        
        changeShapeState(shape);

        context.beginPath();
        context.rect(shape.x, shape.y, shape.width, shape.height);
        context.fillStyle = shape.fill;
        context.fill();   
        context.stroke();
        context.closePath();        
    }

    function drawCircle(context, shape) {       
        changeShapeState(shape);
        
        context.beginPath();
        context.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
        context.fillStyle = shape.fill;   
        context.fill();
        context.stroke();
        context.closePath();        
    }

    function changeShapeState(shape) {
        if (!draggingShape) {
            ctx.strokeStyle = shape.fill;
        }

        if (draggingShape && shape.id === draggingShape.id) {
            ctx.strokeStyle = "red";
            ctx.globalCompositeOperation = "source-over";  
        } 
        else {
            ctx.globalCompositeOperation = "destination-over";
            ctx.strokeStyle = shape.fill;
        }
    }

    function updateShapes(shapes) {
        localStorage.setItem('shapes', JSON.stringify(shapes));
    }

    function loadShapes() {
        const shapesJson = localStorage.getItem('shapes');
        let shapes = [];

        if (shapesJson) {
            shapes = JSON.parse(shapesJson);
        } 
        else {
            updateShapes([]);
        }

        return shapes.some(el => el.id === 'defaultCircle' || el.id === 'defaultRectangle')
            ? shapes
            : shapes.concat(defaultShapes);
    }
    
    function createDndApp() {      
        drawDndZone();     
    }

    window.createDndApp = createDndApp;
})();