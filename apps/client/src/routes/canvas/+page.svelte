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
	import type { ElVector, DibitElement } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { BehaviorSubject, fromEvent, map, merge, Subject, type Observable } from 'rxjs';
  import { match } from 'ts-pattern';

	let svg: Svg; // root SVG element
	let elements: Record<string, DibitElement> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text';

	let focusedElementId: string = ''; // UUID
	let outlineEl: OutlineElement | undefined; 
	let vertexPoints: Array<VertexPoint> = [];

	let mouseCoord$ = new Subject<{x: number, y: number}>();
	let mouseCoordDiffs$ = new Subject<{dx: number, dy: number}>();
	let clickUp$ = new Subject<void>();

	// signals
	let drawEnd$ = new Subject<void>;

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
		window.addEventListener('mouseup', () => clickUp$.next());

		// mouse coord diffs stream
		let prevmx: number;
		let prevmy: number;
		window.addEventListener('mousemove', (event: MouseEvent) => {
			const mx = event.pageX;
			const my = event.pageY;

			const dx = mx - prevmx;
			const dy = my - prevmy;

			mouseCoord$.next({x: mx, y: my});
			mouseCoordDiffs$.next({dx, dy});

			prevmx = mx;
			prevmy = my;
		});

		// window resize observer
		const clientResizeObserver = new ResizeObserver(() => {
			svg.size(document.body.clientWidth, document.body.clientHeight);
		});
		clientResizeObserver.observe(document.body);

		// -- ADD TEST ELEMENTS --
		(async () => {
			const el = new RectVector(svg, 500, 500, mouseCoordDiffs$, clickUp$);
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 600, mouseCoordDiffs$, clickUp$);
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 500, 700, mouseCoordDiffs$, clickUp$);
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(svg, 900, 300, mouseCoordDiffs$, clickUp$);
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
			elements[focusedElementId].deselect();
			focusedElementId = '';
			clearVertexPoints();
			removeOutline();
		} else if (event.button === 0 && tar.nodeName === 'svg') {
 			// drawing an element
			const el = new LineVector(
				svg, 
				event.pageX,
				event.pageY,
				mouseCoordDiffs$, 
				clickUp$);
			const id = await randomID();
			focusedElementId = id;

			addElement(id, el);
			drawStart(event, el);

		} else if (toFocusId) { // selecting an element
			focusedElementId = toFocusId;

			const el = elements[focusedElementId];
			el.select();
			el.value.front();

			setOutline(el);
			drawVertexPoints(el);
		}
	}

	function drawVertexPoints(el: DibitElement) {
		
		clearVertexPoints();
		const vtxPs = el.getVertexPoints(svg, mouseCoordDiffs$, clickUp$);
		for (const vtxp of vtxPs) {
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
		el: DibitElement
	) {
		// update element based on mouse movement
		el.addStreamListener(
			mouseCoord$, 
			(stream) => ({x2: stream.x, y2: stream.y}),
			{ stop$: drawEnd$ }
		);

		// when a second click is made the drawing process will stop
		svg.mousedown((event: MouseEvent) => {
			drawEnd(svg, el);
		});
	}
	
  function drawEnd(svg: Svg, el: DibitElement) {
		// remove event listeners
		svg.off();

		// send draw end signal
		drawEnd$.next();

		// reset handlers
		svg.mousedown((event: MouseEvent) => clickHandler(event));
	}

	function addElement(id: string, el: DibitElement) {
		elementCount++;
		elements[id] = el;
		elementsStore.set(elements);
		el.value.attr('data-id', id);
		el.value.front();
	}

	function setOutline(el: DibitElement) {

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
