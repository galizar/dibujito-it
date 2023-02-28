<script lang=ts>
	import { 
		SVG, 
		Svg, Rect, Line
	} from '@svgdotjs/svg.js';
	import { 
		RectVector, 
		LineVector, 
		VertexPoint, 
		getVertexPointsCoords, 
		OutlineElement } from '$lib';
	import type { ElVector } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Observable } from 'rxjs';
	import { fromEvent, map } from 'rxjs';

	let svg: Svg; // root SVG element
	let elements: Record<string, ElVector> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text';

	let focusedElementId: string = ''; // UUID
	let outlineEl: OutlineElement | undefined; 
	let vertexPoints: Array<VertexPoint> = [];

	let mouseCoord$: Observable<{x: number, y: number}>;

	$: {
		console.log('element count:', elementCount);
	}

	onMount(() => {
		// CURRENTLY DRAWING LINES
		toDraw = 'line';

		svg = SVG()
			.addTo('#drawing-board')
			.size(document.body.clientWidth, document.body.clientHeight);

		svg.mousedown((event: MouseEvent) => clickHandler(event));

		const clientResizeObserver = new ResizeObserver(() => {
			svg.size(document.body.clientWidth, document.body.clientHeight);
		});

		clientResizeObserver.observe(document.body);

		// -- streams

		mouseCoord$ = fromEvent<MouseEvent>(window, 'mousemove')
			.pipe(map(event => ({x: event.pageX, y: event.pageY})));

		// --

		// -- ADD TEST ELEMENTS --
		(async () => {
			const el = new RectVector(svg, 500, 500);
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 600);
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 700);
			const id = await randomID();
			addElement(id, el);
		})();
		// --
	});

	async function randomID() {
		// return self.crypto.randomUUID();
		const res = await fetch('api/uuid');
		return res.text();
	}

	async function clickHandler(event: MouseEvent) {
		const tar = event.target as HTMLElement;
		const toFocusId = tar.getAttribute('data-id') ?? '';

		if (focusedElementId && tar.nodeName === 'svg') {
			// unselect element when clicking on canvas
			focusedElementId = '';
			clearVertexPoints();
			removeOutline();
		} else if (event.button === 0 && tar.nodeName === 'svg') {
 			// drawing an element
			const el = new LineVector(
				svg, 
				event.pageX,
				event.pageY);
			const id = await randomID();
			focusedElementId = id;

			addElement(id, el);
			drawStart(event, el);

		} else if (toFocusId) { // selecting an element
			focusedElementId = toFocusId;

			const el = elements[focusedElementId];
			el.value.front();

			setOutline(el);
			drawVertexPoints(el);
		}
	}

	function drawVertexPoints(el: ElVector) {
		
		clearVertexPoints();
		const vtxData = getVertexPointsCoords(el.value);
		for (const pdata of vtxData) {
			const vtxp = new VertexPoint(pdata.cx, pdata.cy, svg, el);
			vertexPoints.push(vtxp)
		}
	}

	function clearVertexPoints() {

		for (const p of vertexPoints) {
			svg.removeElement(p.value);
			p.onDestroy();
		}
		vertexPoints = [];
	}

	function drawStart(
		event: MouseEvent, 
		el: ElVector
	) {
		// update element based on mouse movement
		el.registerStreamToAttributesMapper(
			mouseCoord$, 
			(stream) => ({x2: stream.x, y2: stream.y})
		);

		// when a second click is made the drawing process will stop
		svg.mousedown((event: MouseEvent) => {
			drawEnd(svg, el);
		});
	}
	
	function drawEnd(svg: Svg, el: ElVector) {
		// remove event listeners
		svg.off();

		// remove drawing update listeners
		el.clearSubscriptions();

		// reset handlers
		svg.mousedown((event: MouseEvent) => clickHandler(event));
	}

	function addElement(id: string, el: ElVector) {
		elementCount++;
		elements[id] = el;
		elementsStore.set(elements);
		el.value.attr('data-id', id);
		el.value.front();
	}

	function setOutline(el?: ElVector) {

		removeOutline();
		
		if (el) {
			outlineEl = new OutlineElement(el, svg);
		} 
	}

	function removeOutline() {
		if (outlineEl) {
			svg.removeElement(outlineEl.value);
			outlineEl.onDestroy();
			outlineEl = undefined;
		}
	}

</script>

<div id="drawing-board">
</div>
