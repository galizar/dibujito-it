<script lang=ts>
	import { 
		SVG, 
		Svg, Rect, Line, type CoordinateXY, Path
	} from '@svgdotjs/svg.js';
	import { 
		RectVector, 
		LineVector, 
		VertexPoint, 
		getVertexPointsCoords, 
		OutlineElement, 
        FreehandVector} from '$lib';
	import type { ElVector, DibitElement } from '$lib';
  import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { 
		BehaviorSubject, 
		fromEvent, 
		map, 
		merge, 
		takeUntil, 
		Subject, 
		type
		Observable, 
        combineLatestWith} from 'rxjs';
  import { match } from 'ts-pattern';

	let svg: Svg; // root SVG element
	let elements: Record<string, DibitElement> = {};
	let elementsStore = writable(elements);
	let elementCount = 0;
	let toDraw: 'line' | 'rect' | 'text' | 'freehand';

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
		toDraw = 'freehand';

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

		(async () => {
			// const el = new FreehandVector(svg, 10, 10, mouseCoordDiffs$, clickUp$);
			// const id = await randomID();
 
			// el.addTestCurveTo(20, 20);

			// (<Path>el.value).plot('M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80')

			// addElement(id, el);

			// --

			const nonSmoothPath = '\
				M 1208 374 L 1208 373 L 1208 372 L 1208 371 L 1208 369 L 1209 368 L 1211 365 L \
				1213 364 L 1215 361 L 1218 358 L 1219 356 L 1221 354 L 1221 353 L 1222 351 L \
				1222 350 L 1224 347 L 1224 344 L 1224 342 L 1224 342 L 1224 340 L 1224 336 L \
				1224 331 L 1224 325 L 1224 320 L 1223 312 L 1221 308 L 1218 304 L 1216 301 L \
				1214 298 L 1213 294 L 1210 291 L 1208 287 L 1207 285 L 1205 282 L 1204 279 L \
				1204 273 L 1203 269 L 1202 265 L 1199 260 L 1199 259 L 1199 256 L 1199 253 L \
				1199 250 L 1199 247 L 1199 244 L 1199 242 L 1199 241 L 1199 240 L 1199 239 L \
				1201 234 L 1207 228 L 1210 225 L 1213 222 L 1216 219 L 1218 217 L 1221 215 L \
				1224 212 L 1227 211 L 1228 210 L 1229 209 L 1230 209 L 1231 208 L 1231 207 L \
				1231 204 L 1231 200 L 1231 195 L 1231 190 L 1231 186 L 1231 181 L 1231 178 L \
				1229 175 L 1227 173 L 1224 170 L 1221 167 L 1219 165 L 1216 163 L 1213 162 L \
				1210 160 L 1207 159 L 1202 156 L 1199 154 L 1197 153 L 1195 151 L 1191 148 L \
				1189 147 L 1187 145 L 1186 144 L 1185 142 L 1185 139 L 1185 137 L 1185 136 L \
				1185 133 L 1185 131 L 1185 128 L 1185 125 L 1185 122 L 1186 118 L 1189 115 L \
				1193 111 L 1196 108 L 1201 104 L 1206 101 L 1213 97 L 1216 96 L 1218 96 L 1222 \
				94 L 1224 93 L 1227 91 L 1230 90 L 1231 89 L 1233 87 L 1234 85 L 1234 80 L 1234 \
				72 L 1234 67 L 1234 61 L 1234 58 L 1234 55 L 1233 52 L 1232 50 L 1231 48 L 1228 \
				47 L 1227 46 L 1223 44 L 1218 42 L 1216 40 L 1212 39 L 1208 37 L 1206 36 L 1204 \
				34 L 1203 33 L 1199 31 L 1197 30 L 1193 28 L 1191 27 L 1188 24 L 1187 23 L 1185 \
				21 L 1185 19 L 1185 17 L 1184 15 \
				';
			
			const testPathArr = [
			  {
			    "x": 1208,
			    "y": 373
			  },
			  {
			    "x": 1208,
			    "y": 372
			  },
			  {
			    "x": 1208,
			    "y": 371
			  },
			  {
			    "x": 1208,
			    "y": 369
			  },
			  {
			    "x": 1209,
			    "y": 368
			  },
			  {
			    "x": 1211,
			    "y": 365
			  },
			  {
			    "x": 1213,
			    "y": 364
			  },
			  {
			    "x": 1215,
			    "y": 361
			  },
			  {
			    "x": 1218,
			    "y": 358
			  },
			  {
			    "x": 1219,
			    "y": 356
			  },
			  {
			    "x": 1221,
			    "y": 354
			  },
			  {
			    "x": 1221,
			    "y": 353
			  },
			  {
			    "x": 1222,
			    "y": 351
			  },
			  {
			    "x": 1222,
			    "y": 350
			  },
			  {
			    "x": 1224,
			    "y": 347
			  },
			  {
			    "x": 1224,
			    "y": 344
			  },
			  {
			    "x": 1224,
			    "y": 342
			  },
			  {
			    "x": 1224,
			    "y": 342
			  },
			  {
			    "x": 1224,
			    "y": 340
			  },
			  {
			    "x": 1224,
			    "y": 336
			  },
			  {
			    "x": 1224,
			    "y": 331
			  },
			  {
			    "x": 1224,
			    "y": 325
			  },
			  {
			    "x": 1224,
			    "y": 320
			  },
			  {
			    "x": 1223,
			    "y": 312
			  },
			  {
			    "x": 1221,
			    "y": 308
			  },
			  {
			    "x": 1218,
			    "y": 304
			  },
			  {
			    "x": 1216,
			    "y": 301
			  },
			  {
			    "x": 1214,
			    "y": 298
			  },
			  {
			    "x": 1213,
			    "y": 294
			  },
			  {
			    "x": 1210,
			    "y": 291
			  },
			  {
			    "x": 1208,
			    "y": 287
			  },
			  {
			    "x": 1207,
			    "y": 285
			  },
			  {
			    "x": 1205,
			    "y": 282
			  },
			  {
			    "x": 1204,
			    "y": 279
			  },
			  {
			    "x": 1204,
			    "y": 273
			  },
			  {
			    "x": 1203,
			    "y": 269
			  },
			  {
			    "x": 1202,
			    "y": 265
			  },
			  {
			    "x": 1199,
			    "y": 260
			  },
			  {
			    "x": 1199,
			    "y": 259
			  },
			  {
			    "x": 1199,
			    "y": 256
			  },
			  {
			    "x": 1199,
			    "y": 253
			  },
			  {
			    "x": 1199,
			    "y": 250
			  },
			  {
			    "x": 1199,
			    "y": 247
			  },
			  {
			    "x": 1199,
			    "y": 244
			  },
			  {
			    "x": 1199,
			    "y": 242
			  },
			  {
			    "x": 1199,
			    "y": 241
			  },
			  {
			    "x": 1199,
			    "y": 240
			  },
			  {
			    "x": 1199,
			    "y": 239
			  },
			  {
			    "x": 1201,
			    "y": 234
			  },
			  {
			    "x": 1207,
			    "y": 228
			  },
			  {
			    "x": 1210,
			    "y": 225
			  },
			  {
			    "x": 1213,
			    "y": 222
			  },
			  {
			    "x": 1216,
			    "y": 219
			  },
			  {
			    "x": 1218,
			    "y": 217
			  },
			  {
			    "x": 1221,
			    "y": 215
			  },
			  {
			    "x": 1224,
			    "y": 212
			  },
			  {
			    "x": 1227,
			    "y": 211
			  },
			  {
			    "x": 1228,
			    "y": 210
			  },
			  {
			    "x": 1229,
			    "y": 209
			  },
			  {
			    "x": 1230,
			    "y": 209
			  },
			  {
			    "x": 1231,
			    "y": 208
			  },
			  {
			    "x": 1231,
			    "y": 207
			  },
			  {
			    "x": 1231,
			    "y": 204
			  },
			  {
			    "x": 1231,
			    "y": 200
			  },
			  {
			    "x": 1231,
			    "y": 195
			  },
			  {
			    "x": 1231,
			    "y": 190
			  },
			  {
			    "x": 1231,
			    "y": 186
			  },
			  {
			    "x": 1231,
			    "y": 181
			  },
			  {
			    "x": 1231,
			    "y": 178
			  },
			  {
			    "x": 1229,
			    "y": 175
			  },
			  {
			    "x": 1227,
			    "y": 173
			  },
			  {
			    "x": 1224,
			    "y": 170
			  },
			  {
			    "x": 1221,
			    "y": 167
			  },
			  {
			    "x": 1219,
			    "y": 165
			  },
			  {
			    "x": 1216,
			    "y": 163
			  },
			  {
			    "x": 1213,
			    "y": 162
			  },
			  {
			    "x": 1210,
			    "y": 160
			  },
			  {
			    "x": 1207,
			    "y": 159
			  },
			  {
			    "x": 1202,
			    "y": 156
			  },
			  {
			    "x": 1199,
			    "y": 154
			  },
			  {
			    "x": 1197,
			    "y": 153
			  },
			  {
			    "x": 1195,
			    "y": 151
			  },
			  {
			    "x": 1191,
			    "y": 148
			  },
			  {
			    "x": 1189,
			    "y": 147
			  },
			  {
			    "x": 1187,
			    "y": 145
			  },
			  {
			    "x": 1186,
			    "y": 144
			  },
			  {
			    "x": 1185,
			    "y": 142
			  },
			  {
			    "x": 1185,
			    "y": 139
			  },
			  {
			    "x": 1185,
			    "y": 137
			  },
			  {
			    "x": 1185,
			    "y": 136
			  },
			  {
			    "x": 1185,
			    "y": 133
			  },
			  {
			    "x": 1185,
			    "y": 131
			  },
			  {
			    "x": 1185,
			    "y": 128
			  },
			  {
			    "x": 1185,
			    "y": 125
			  },
			  {
			    "x": 1185,
			    "y": 122
			  },
			  {
			    "x": 1186,
			    "y": 118
			  },
			  {
			    "x": 1189,
			    "y": 115
			  },
			  {
			    "x": 1193,
			    "y": 111
			  },
			  {
			    "x": 1196,
			    "y": 108
			  },
			  {
			    "x": 1201,
			    "y": 104
			  },
			  {
			    "x": 1206,
			    "y": 101
			  },
			  {
			    "x": 1213,
			    "y": 97
			  },
			  {
			    "x": 1216,
			    "y": 96
			  },
			  {
			    "x": 1218,
			    "y": 96
			  },
			  {
			    "x": 1222,
			    "y": 94
			  },
			  {
			    "x": 1224,
			    "y": 93
			  },
			  {
			    "x": 1227,
			    "y": 91
			  },
			  {
			    "x": 1230,
			    "y": 90
			  },
			  {
			    "x": 1231,
			    "y": 89
			  },
			  {
			    "x": 1233,
			    "y": 87
			  },
			  {
			    "x": 1234,
			    "y": 85
			  },
			  {
			    "x": 1234,
			    "y": 80
			  },
			  {
			    "x": 1234,
			    "y": 72
			  },
			  {
			    "x": 1234,
			    "y": 67
			  },
			  {
			    "x": 1234,
			    "y": 61
			  },
			  {
			    "x": 1234,
			    "y": 58
			  },
			  {
			    "x": 1234,
			    "y": 55
			  },
			  {
			    "x": 1233,
			    "y": 52
			  },
			  {
			    "x": 1232,
			    "y": 50
			  },
			  {
			    "x": 1231,
			    "y": 48
			  },
			  {
			    "x": 1228,
			    "y": 47
			  },
			  {
			    "x": 1227,
			    "y": 46
			  },
			  {
			    "x": 1223,
			    "y": 44
			  },
			  {
			    "x": 1218,
			    "y": 42
			  },
			  {
			    "x": 1216,
			    "y": 40
			  },
			  {
			    "x": 1212,
			    "y": 39
			  },
			  {
			    "x": 1208,
			    "y": 37
			  },
			  {
			    "x": 1206,
			    "y": 36
			  },
			  {
			    "x": 1204,
			    "y": 34
			  },
			  {
			    "x": 1203,
			    "y": 33
			  },
			  {
			    "x": 1199,
			    "y": 31
			  },
			  {
			    "x": 1197,
			    "y": 30
			  },
			  {
			    "x": 1193,
			    "y": 28
			  },
			  {
			    "x": 1191,
			    "y": 27
			  },
			  {
			    "x": 1188,
			    "y": 24
			  },
			  {
			    "x": 1187,
			    "y": 23
			  },
			  {
			    "x": 1185,
			    "y": 21
			  },
			  {
			    "x": 1185,
			    "y": 19
			  },
			  {
			    "x": 1185,
			    "y": 17
			  },
			  {
			    "x": 1184,
			    "y": 15
			  }
			];

			// non-smooth path
			const el = svg.path(nonSmoothPath);
			el.fill('none');
			el.stroke({width: 2, color: 'black'});

			type Coords = {x: number, y: number};

			// smooth path
			const toSmooth = [
				{x: 5, y: 10},
				{x: 10, y: 40},
				{x: 40, y: 30},
				{x: 60, y: 5},
				{x: 90, y: 45},
				{x: 120, y: 10},
				{x: 150, y: 45},
				{x: 200, y: 10}
			];

			// get the *opposed line*
			const line = (pointA: Coords, pointB: Coords) => {  
				const lengthX = pointB.x - pointA.x
				const lengthY = pointB.y - pointA.y
				
				return {  
					length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),  
					angle: Math.atan2(lengthY, lengthX)  
				}  
			}

			const controlPoint = (
				current: Coords | undefined, 
			  previous: Coords | undefined, 
			  next: Coords, 
			  reverse: boolean) => {  

				// When 'current' is the first or last point of the array  
				// 'previous' or 'next' don't exist.  
				// Replace with 'current'  
				const p = previous || current  
				const n = next || current  
				
				// The smoothing ratio  
				const smoothing = 0.2  
				
				// Properties of the opposed-line  
				const o = line(p!, n)  
				
				// If is end-control-point, add PI to the angle to go backward  
				const angle = o.angle + (reverse ? Math.PI : 0)  
				const length = o.length * smoothing  
				
				// The control point position is relative to the current point  
				const x = (current ? current.x : 0) + Math.cos(angle) * length;
				const y = (current ? current.y : 0) + Math.sin(angle) * length;

				return [x, y];
			}

			const bezierCommand = (point: Coords, i: number, a: Array<Coords>) => {  
  			// start control point  
  			const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
  			// end control point  
  			const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
  			return ` C ${cpsX} ${cpsY}, ${cpeX} ${cpeY}, ${point.x} ${point.y}`  
			}

			// test path 1
			let i = 1;
			let smoothPath = 'M 500 374';
			for (const p of testPathArr) {
				smoothPath += bezierCommand(p, i, testPathArr);
				i++;	
			}
			const smoothEl = svg.path(smoothPath);
			smoothEl.fill('none');
			smoothEl.stroke({width: 2, color: 'black'});
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
			drawStart(event);

		} else if (toFocusId) { // selecting an element
			focusedElementId = toFocusId;

			const el = elements[focusedElementId];
			el.select();
			el.value.front();

			setOutline(el);
			drawVertexPoints(el);
		}
	}

	async function drawStart(
		event: MouseEvent, 
	) {
		const id = await randomID();
		focusedElementId = id;

		const mx = event.pageX;
		const my = event.pageY;

		match(toDraw)
			.with('line', () => {
				const el = new LineVector(
					svg, 
					mx,
					my,
					mouseCoordDiffs$, 
					clickUp$);

				addElement(id, el);

				el.addStreamListener(
					mouseCoord$, 
					(stream) => ({x2: stream.x, y2: stream.y}),
					{ stop$: drawEnd$ }
				);

				// when a second click is made the drawing process will stop
				svg.mousedown((event: MouseEvent) => {
					drawEnd(svg);
				});
			})
			.with('rect', () => {

			})
			.with('freehand', () => {
				const el = new FreehandVector(
					svg,
					mx,
					my,
					mouseCoordDiffs$,
					clickUp$
				);

				addElement(id, el);

				const testArr: Array<{x: number, y: number}> = [];
				let i = 0;

				mouseCoord$.pipe(
					takeUntil(drawEnd$)
				).subscribe(({x, y}) => {

					el.appendPoint(x, y);
					testArr[i] = {x, y};
					i++;
				});

				// finish drawing on click up 
				clickUp$.pipe(
					takeUntil(drawEnd$)
				).subscribe(() => {
					drawEnd(svg); 
					console.log(el.attrs.d);
					console.log(JSON.stringify(testArr));
				});
			})
			.run();
	}
	
  function drawEnd(svg: Svg) {
		// remove event listeners
		svg.off();

		// emit draw end signal
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
