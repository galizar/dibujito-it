<script lang=ts>
	import { 
		SVG, 
		Svg, Rect, Line
	} from '@svgdotjs/svg.js';
	import { RectVector, LineVector } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let elements: Record<string, Rect | Line> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text';

	let focusedElementId: string = ''; // UUID
	let isFocusedComplete: boolean;
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
		
		draw.mousedown(async (event: MouseEvent) => {

			const tar = event.target as HTMLElement;
			const toFocusId = tar.getAttribute('data-id') ?? '';

			if (focusedElementId && tar.nodeName === 'svg') {
				// unselect element when clicking on canvas
				isFocusedComplete = true;
				focusedElementId = '';
				removeOutline(draw);
			} else if (event.button === 0 && tar.nodeName === 'svg') {
 				// drawing an element
				const el = new LineVector(
					draw, 
					event.pageX,
					event.pageY).value;
				const id = await randomID();

				addElement(id, el);

				focusedElementId = id;
			} else if (toFocusId) {
				isFocusedComplete = true;
				// selecting an element
				focusedElementId = toFocusId;

				const el = elements[focusedElementId];
				el.front();

				setOutline(draw, el);
			}
		});

		draw.mousemove((event: MouseEvent) => {
			if (focusedElementId && !isFocusedComplete) {
				elements[focusedElementId].attr({x2: event.pageX, y2: event.pageY});
			}

			// moves outline to follow its host
			if (outlineEl) {
				setOutline(draw, elements[focusedElementId]);
			}
		});

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
