<script lang="ts">
	import { onMount } from 'svelte';
	
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;

	// MOVE this to a model library
	type LineDrawing = {
		x0: number
		y0: number
		x1: number
		y1: number
		color: string // hex
		width: number // pixels
	}
	// this will probably have to change later on to be of a more general type
	const drawings: LineDrawing[] = [];

	// cursor coordinates
  let cursorX: number; 
  let cursorY: number;
  let prevCursorX: number;
  let prevCursorY: number;

	let clientWidth: number;
	let clientHeight: number;

	// distance to origin
	let offsetX: number;
	let offsetY: number;

	// zoom quantity
	let scale: number = 1;

	let leftMouseDown = false;
	let rightMouseDown = false;

	onMount(() => {
		ctx = canvas.getContext('2d');

		redrawCanvas(ctx!, canvas);

		const clientResizeObserver = new ResizeObserver(() => {
			redrawCanvas(ctx!, canvas);
		});

		clientResizeObserver.observe(document.body);
	});

  function redrawCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    // set the canvas to the size of the window
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.strokeText(`${canvas.width} x ${canvas.height}`, 5, 10);
    for (const line of drawings) {
      drawLine(
				toScreenX(line.x0), 
				toScreenY(line.y0), 
				toScreenX(line.x1), 
				toScreenY(line.y1),
				line.color,
				line.width
			);
    }
  }

  function toScreenX(trueX: number) {
      return (trueX + offsetX) * scale;
  }
  function toScreenY(trueY: number) {
      return (trueY + offsetY) * scale;
  }
	function toTrueX(xScreen: number) {
      return (xScreen / scale) - offsetX;
  }
  function toTrueY(yScreen: number) {
      return (yScreen / scale) - offsetY;
  }

  function drawLine(
		x0: number, 
		y0: number, 
		x1: number, 
		y1: number,
		color: string,
		width: number
	) {
    ctx!.beginPath();
    ctx!.moveTo(x0, y0);
    ctx!.lineTo(x1, y1);
    ctx!.strokeStyle = color;
    ctx!.lineWidth = width;
    ctx!.stroke();
  }

	function onMouseDown(event: MouseEvent) {
    // detect left clicks
    if (event.button == 0) {
        leftMouseDown = true;
        rightMouseDown = false;
    }
    // detect right clicks
    if (event.button == 2) {
        rightMouseDown = true;
        leftMouseDown = false;
    }
    // update the cursor coordinates
    cursorX = event.pageX;
    cursorY = event.pageY;
    prevCursorX = event.pageX;
    prevCursorY = event.pageY;
	}
	function onMouseMove(
		event: MouseEvent, 
		ctx: CanvasRenderingContext2D, 
		canvas: HTMLCanvasElement
	) {
		cursorX = event.pageX;
		cursorY = event.pageY;
		const scaledX = toTrueX(cursorX);
		const scaledY = toTrueY(cursorY);
		const prevScaledX = toTrueX(prevCursorX);
		const prevScaledY = toTrueY(prevCursorY);

		const dummyColor = '#000';
		const dummyWidth = 2;

		if (leftMouseDown) {
 	    // add the line to our drawing history
 	    drawings.push({
 	        x0: prevScaledX,
 	        y0: prevScaledY,
 	        x1: scaledX,
 	        y1: scaledY,
					color: dummyColor,
					width: dummyWidth 
 	    })
 	    // draw a line
 	    drawLine(prevCursorX, prevCursorY, cursorX, cursorY, dummyColor, dummyWidth);
 	  }
 	  if (rightMouseDown) {
 	    // move the screen
 	    offsetX += (cursorX - prevCursorX) / scale;
 	    offsetY += (cursorY - prevCursorY) / scale;
 	    redrawCanvas(ctx, canvas);
 	  }
 	  prevCursorX = cursorX;
 	  prevCursorY = cursorY;
	}
	function onMouseUp() {
		leftMouseDown = false;
		rightMouseDown = false;
	}

</script>

<style>
	#myCanvas {
		margin: 0;
		padding: 0;
	}
</style>

<canvas 
	bind:this={canvas}
	on:mousemove={(event) => ctx ? onMouseMove(event, ctx, canvas) : console.log('ctx is null')}
	on:mousedown={onMouseDown}
	on:mouseup={onMouseUp}
	id="myCanvas" 
></canvas>