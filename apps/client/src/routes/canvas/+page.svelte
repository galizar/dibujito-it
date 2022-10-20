<script lang="ts">
	import { onMount } from 'svelte';

	import type { LineDrawing } from '$lib';
	import type { PageData } from './$types';

	export let data: PageData;
	
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;

	// this will probably have to change later on to be of a more general type

	const drawings: LineDrawing[] = data.drawings;

	// cursor coordinates
  let cursorX: number; 
  let cursorY: number;
  let prevCursorX: number;
  let prevCursorY: number;

	let clientWidth: number;
	let clientHeight: number;

	// distance to origin
	let offsetX: number = 0;
	let offsetY: number = 0;

	// zoom quantity
	let scale: number = 1;

	let leftMouseDown = false;
	let prevLeftMouseDown = false;
	let rightMouseDown = false;

	onMount(() => {
		ctx = canvas.getContext('2d');

		redrawCanvas(ctx!, canvas);

		document.oncontextmenu = function () {
			return false;
		}

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
	function trueHeight() {
		return canvas.clientHeight / scale;
	}
	function trueWidth() {
		return canvas.clientWidth / scale;
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
				prevLeftMouseDown = true;
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
 	    });
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
	function onMouseWheel(
		event: WheelEvent,
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement
	) {
		const deltaY = event.deltaY; // mouse wheel movement delta
		// counterintuitively, deltaY is negative when you zoom "in", that's the
		// reason for the minus sign here
		const scaleAmount = -deltaY / 500; 
		scale = scale * (1 + scaleAmount);

		const directionX = event.pageX / canvas.clientWidth;
		const directionY = event.pageY / canvas.clientHeight;

		const unitsZoomedX = trueWidth() * scaleAmount;
		const unitsZoomedY = trueHeight() * scaleAmount;

		const xStep = unitsZoomedX * directionX;
		const yStep = unitsZoomedY * directionY;

		offsetX -= xStep;
		offsetY -= yStep;

		redrawCanvas(ctx, canvas);
	}
	function onMouseUp(event: MouseEvent) {
		leftMouseDown = false;
		rightMouseDown = false;
	}

	// touch
	const prevTouches = {} as TouchList;
	let singleTouch = false;
	let doubleTouch = false;
	function onTouchStart(event: TouchEvent) {
		if (event.touches.length === 1) {
			singleTouch = true;
			doubleTouch = false;
		}
		if (event.touches.length >= 2) {
			singleTouch = false;
			doubleTouch = true;
		}
		prevTouches[0] = event.touches[0];
		prevTouches[1] = event.touches[1];
	}
	function onTouchMove(event: TouchEvent) {
		// get first touch coordinates
    const touch0X = event.touches[0].pageX;
    const touch0Y = event.touches[0].pageY;
    const prevTouch0X = prevTouches[0].pageX;
    const prevTouch0Y = prevTouches[0].pageY;

    const scaledX = toTrueX(touch0X);
    const scaledY = toTrueY(touch0Y);
    const prevScaledX = toTrueX(prevTouch0X);
    const prevScaledY = toTrueY(prevTouch0Y);

		const dummyColor = '#000';
		const dummyWidth = 2;

		if (singleTouch) {
			drawings.push({
				x0: prevScaledX, 
				y0: prevScaledY,
				x1: scaledX,
				y1: scaledY,
				color: dummyColor,
				width: dummyWidth 
			});
			drawLine(prevTouch0X, prevTouch0Y, touch0X, touch0Y, dummyColor, dummyWidth);
		}
		if (doubleTouch) {
	    // get second touch coordinates
      const touch1X = event.touches[1].pageX;
      const touch1Y = event.touches[1].pageY;
      const prevTouch1X = prevTouches[1].pageX;
      const prevTouch1Y = prevTouches[1].pageY;

      // get midpoints
      const midX = (touch0X + touch1X) / 2;
      const midY = (touch0Y + touch1Y) / 2;
      const prevMidX = (prevTouch0X + prevTouch1X) / 2;
      const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;

      // calculate the distances between the touches
      const hypot = Math.sqrt(Math.pow((touch0X - touch1X), 2) + Math.pow((touch0Y - touch1Y), 2));
      const prevHypot = Math.sqrt(Math.pow((prevTouch0X - prevTouch1X), 2) + Math.pow((prevTouch0Y - prevTouch1Y), 2));

			console.log('distance this', hypot);
			console.log('distance prev', prevHypot);

      prevTouches[0] = event.touches[0];
      prevTouches[1] = event.touches[1];
		}
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
	id="myCanvas" 

	on:mousemove={(event) => { if (ctx) onMouseMove(event, ctx, canvas) }}
	on:mousedown={onMouseDown}
	on:mouseup={onMouseUp}
	on:wheel={(event) => { if (ctx) onMouseWheel(event, ctx, canvas) }}

></canvas>
