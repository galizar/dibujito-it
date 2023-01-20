<script lang=ts>
	import { 
		SVG, 
		Svg, Rect, Line
	} from '@svgdotjs/svg.js';
	import type { ElVector } from '$lib';
	import { RectVector, LineVector } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let elements: Record<string, Rect | Line> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text';

	let focusedElementId: string = ''; // UUID
	let outlineEl: Line | Rect | undefined;

	$: {
		console.log('element count:', elementCount);
	}

	onMount(() => {
		// CURRENTLY DRAWING LINES
		toDraw = 'line';

		const clientResizeObserver = new ResizeObserver(() => {
			draw.size(document.body.clientWidth, document.body.clientHeight);
		});

		clientResizeObserver.observe(document.body);

		let draw = SVG()
			.addTo('#drawing-board')
			.size(document.body.clientWidth, document.body.clientHeight);

		draw.mousedown((event: MouseEvent) => clickHandler(event, draw));
		draw.mousemove((event: MouseEvent) => moveHandler(event, draw));

		// -- ADD TEST ELEMENTS --
		(async () => {
			const el = new RectVector(draw, 500, 500).value;
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(draw, 500, 600).value;
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new RectVector(draw, 500, 700).value;
			const id = await randomID();
			addElement(id, el);
		})();

		(async () => {
			const el = new LineVector(draw, 300, 300).value;
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

	async function clickHandler(event: MouseEvent, svg: Svg) {
		const tar = event.target as HTMLElement;
		const toFocusId = tar.getAttribute('data-id') ?? '';

		if (focusedElementId && tar.nodeName === 'svg') {
			// unselect element when clicking on canvas
			focusedElementId = '';
			removeOutline(svg);
		} else if (event.button === 0 && tar.nodeName === 'svg') {
 			// drawing an element
			const el = new LineVector(
				svg, 
				event.pageX,
				event.pageY);
			const id = await randomID();

			addElement(id, el.value);

			focusedElementId = id;

			drawStart(event, svg, el);

		} else if (toFocusId) {
			// selecting an element
			focusedElementId = toFocusId;

			const el = elements[focusedElementId];
			el.front();

			setOutline(svg, el);
		}
	}

	function moveHandler(event: MouseEvent, svg: Svg) {
		// moves outline to follow its host
		if (outlineEl) {
			setOutline(svg, elements[focusedElementId]);
		}
	}

	function drawStart(event: MouseEvent, svg: Svg, el: ElVector) {
		// bind mouse movement to update drawing
		svg.mousemove((event: MouseEvent) => {
			el.update({x2: event.pageX, y2: event.pageY});
			setOutline(svg, el.value);
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
		svg.mousedown((event: MouseEvent) => clickHandler(event, svg));
		svg.mousemove((event: MouseEvent) => moveHandler(event, svg));
	}

	function addElement(id: string, el: Rect | Line) {
		elementCount++;
		elements[id] = el;
		elementsStore.set(elements);
		el.attr('data-id', id);
		el.front();
	}

	function setOutline(draw: Svg, el?: Rect | Line) {

		removeOutline(draw);
		
		if (el) {
			outlineEl = el.clone();
			outlineEl.stroke({ color: 'grey', width: 8});
			outlineEl.attr('stroke-linecap', 'round');
			draw.add(outlineEl);
			outlineEl.after(el);
		} 
	}

	function removeOutline(draw: Svg) {
		if (outlineEl) {
			draw.removeElement(outlineEl);
			outlineEl = undefined;
		}
	}

</script>

<div id="drawing-board">
</div>
