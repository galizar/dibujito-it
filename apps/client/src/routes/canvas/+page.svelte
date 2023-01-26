<script lang=ts>
	import { 
		SVG, 
		Svg, Rect, Line
	} from '@svgdotjs/svg.js';
	import { RectVector, LineVector, VertexPoint, getVertexPointsCoords } from '$lib';
	import type { ElVector } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let svg: Svg; // root SVG element
	let elements: Record<string, Rect | Line> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text';

	let focusedElementId: string = ''; // UUID
	let outlineEl: Line | Rect | undefined;
	let vertexPoints: Array<VertexPoint> = [];

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
		svg.mousemove((event: MouseEvent) => moveHandler(event));

		const clientResizeObserver = new ResizeObserver(() => {
			svg.size(document.body.clientWidth, document.body.clientHeight);
		});

		clientResizeObserver.observe(document.body);

		// -- ADD TEST ELEMENTS --
		(async () => {
			const el = new RectVector(svg, 500, 500).value;
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 600).value;
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 700).value;
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

			addElement(id, el.value);
			drawStart(event, el);

		} else if (toFocusId) { // selecting an element
			focusedElementId = toFocusId;

			const el = elements[focusedElementId];
			el.front();

			drawVertexPoints(el);
			setOutline(el);
		}
	}

	function drawVertexPoints(el: Line | Rect) {
		
		clearVertexPoints();
		const vtxCoords = getVertexPointsCoords(el);
		for (const point of vtxCoords) {
			const vtxp = new VertexPoint(svg, point.cx, point.cy);
			vertexPoints.push(vtxp)
		}
	}

	function clearVertexPoints() {

		for (const p of vertexPoints) {
			svg.removeElement(p.value);
		}
		vertexPoints = [];
	}

	function moveHandler(event: MouseEvent) {
		// moves outline to follow its host
		if (focusedElementId !== '') {
			const el = elements[focusedElementId];
			setOutline(el);
			drawVertexPoints(el);
		}
	}

	function drawStart(event: MouseEvent, el: ElVector) {
		// bind mouse movement to update drawing
		svg.mousemove((event: MouseEvent) => {
			el.update({x2: event.pageX, y2: event.pageY});
			setOutline(el.value);
		});

		// when a second click is made the drawing process will stop
		svg.mousedown((event: MouseEvent) => {
			drawEnd(svg);
		});
	}
	
	function drawEnd(svg: Svg) {
		// remove event listeners
		svg.off();

		// reset handlers
		svg.mousedown((event: MouseEvent) => clickHandler(event));
		svg.mousemove((event: MouseEvent) => moveHandler(event));
	}

	function addElement(id: string, el: Rect | Line) {
		elementCount++;
		elements[id] = el;
		elementsStore.set(elements);
		el.attr('data-id', id);
		el.front();
	}

	function setOutline(el?: Rect | Line) {

		removeOutline();
		
		if (el) {
			outlineEl = el.clone();
			outlineEl.stroke({ color: 'grey', width: 6});
			outlineEl.attr('stroke-linecap', 'round');
			svg.add(outlineEl);
			outlineEl.after(el);
		} 
	}

	function removeOutline() {
		if (outlineEl) {
			svg.removeElement(outlineEl);
			outlineEl = undefined;
		}
	}

</script>

<div id="drawing-board">
</div>
