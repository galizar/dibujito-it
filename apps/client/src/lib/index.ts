import type { Svg, Rect, Line, Circle } from '@svgdotjs/svg.js';
import type { Subscription } from 'rxjs';
import { Observable, BehaviorSubject } from 'rxjs';
import { match, P } from 'ts-pattern';

const baseColor = '#cdc';
const hoverColor = '#8a8';
// const eventNames: 'mousedown' | 'mouseup' | 'mousemove'

type PointMetadata = {
	cx: number,
	cy: number,
}

type ElVectorAttrs = 
	| RectAttributes
	| LineAttributes
	| VtxPointAttrs
	| OutlineElAttrs;

type ElVectorAttrsSubject = 
	| BehaviorSubject<RectAttributes>
	| BehaviorSubject<LineAttributes>
	| BehaviorSubject<VtxPointAttrs>
	| BehaviorSubject<OutlineElAttrs>;

type CoordDiffs = {dx: number, dy: number};

export abstract class ElVector {
	value: Line | Rect | Circle;
	abstract attrs: ElVectorAttrsSubject;
	#subscriptions: Array<Subscription> = [];
	/* stream of position differentials */
	coordDiffs = new BehaviorSubject({dx: 0, dy: 0});

	constructor(
		it: Line | Rect | Circle,
		leftMouseDown$: Observable<boolean>
	) {
    let mouseX: number;
    let mouseY: number;
    let prevMouseX: number;
    let prevMouseY: number;
		let leftMouseDown = false;

		this.#subscriptions.push(
      leftMouseDown$.subscribe((down) => {
        leftMouseDown = down;
      })
    );

    it.mousemove((event: MouseEvent) => {
      mouseX = event.pageX;
      mouseY = event.pageY;

      if (leftMouseDown) {
        const mouseDeltaX = mouseX - prevMouseX;
        const mouseDeltaY = mouseY - prevMouseY;

        it.dmove(mouseDeltaX, mouseDeltaY);
				this.coordDiffs.next({dx: mouseDeltaX, dy: mouseDeltaY});
      }

      prevMouseX = mouseX;
      prevMouseY = mouseY;
    });

    it.mouseup(() => {
			// dragging finished
			this.coordDiffs.next({dx: 0, dy: 0});
    });

    it.mouseout((event: MouseEvent) => {
      const rTar = event.relatedTarget as HTMLElement;

      if (leftMouseDown && rTar.nodeName !== 'HTML') {
        // runs when dragging and the cursor "escapes" the area of the element
        mouseX = event.pageX;
        mouseY = event.pageY;

        const mouseDeltaX = mouseX - prevMouseX;
        const mouseDeltaY = mouseY - prevMouseY;

        it.dmove(mouseDeltaX, mouseDeltaY);
				this.coordDiffs.next({dx: mouseDeltaX, dy: mouseDeltaY});

        prevMouseX = mouseX;
        prevMouseY = mouseY;
      } 
    });

		this.value = it;
  }

	registerStreamToAttributesMapper<TStream>(
		sourceStream: Observable<TStream>,
		mapperFunction: (stream: TStream) => Partial<ElVectorAttrs>
	) {
		this.#subscriptions.push(
      sourceStream.subscribe((stream) => {
        const mappedAttrs = mapperFunction(stream);

        this.value.attr(mappedAttrs);
      })
    );
	}

	/* Used to "connect" the position of elements, i.e. make the element mimic
	 * movement of other element */
	listenForCoordDiffs(
		diffsStream: Observable<CoordDiffs>,
	) {
		this.#subscriptions.push(
      diffsStream.subscribe(({ dx, dy }) => {
        this.value.dmove(dx, dy);
      })
    );
	}

	onDestroy() {
		this.clearSubscriptions();
	}

	clearSubscriptions() {
		for (const sub of this.#subscriptions) sub.unsubscribe();
	}
}

type RectAttributes = {
	x: number,
	y: number,
	width: number,
	height: number
}

export class RectVector extends ElVector {

	#attrsSource: RectAttributes = {x: -1, y: -1, width: -1, height: -1};
	attrs: BehaviorSubject<RectAttributes> = new BehaviorSubject(this.#attrsSource);

	constructor(
		svg: Svg, 
		x: number, y: number,
		leftMouseDown$: Observable<boolean>
	) {
		const baseWidth = 100;
		const baseHeight = 100;

		const it = svg.rect(baseWidth, baseHeight)
			.move(x, y)
			.fill({color: baseColor});
		
		super(it, leftMouseDown$);
		
		this.attrs.next({x, y, width: baseWidth, height: baseHeight});
	}
} 

type LineAttributes = {
	x1: number,
	y1: number,
	x2: number,
	y2: number
}

export class LineVector extends ElVector {

	#attrsSource = {x1: -1, y1: -1, x2: -1, y2: -1};
	attrs = new BehaviorSubject(this.#attrsSource);

	constructor(
		svg: Svg, 
		x: number, 
		y: number,
		leftMouseDown$: Observable<boolean>
	) {
		const it = svg.line(x, y, x, y)
			.stroke({ color: baseColor, width: 3});
		
		super(it, leftMouseDown$);

		this.attrs.next({x1: x, y1: y, x2: x, y2: y});
	}
}

type VtxPointAttrs = {
	cx: number,
	cy: number
}

export class VertexPoint extends ElVector {

	#attrsSource = {cx: -1, cy: -1};
	attrs = new BehaviorSubject(this.#attrsSource);

	constructor(
		cx: number, 
		cy: number, 
		svg: Svg,
		host: ElVector,
		leftMouseDown$: Observable<boolean>
	) {
		const it = svg.circle(8).center(cx, cy).fill('lightgrey');

		it.front();

		it.mouseover((event: MouseEvent) => {
			it.radius(5)
		});

		it.mouseout((event: MouseEvent) => {
			it.radius(4);
		});

		super(it, leftMouseDown$);

		this.attrs.next({cx, cy});
		this.listenForCoordDiffs(host.coordDiffs);
	}
}

type OutlineElAttrs = {
	x: number,
	y: number,
}

export class OutlineElement extends ElVector {

	#attrsSource = {x: -1, y: -1};
	attrs = new BehaviorSubject(this.#attrsSource);

	constructor(
		host: ElVector, 
		svg: Svg,
		leftMouseDown$: Observable<boolean>
	) {
		const it = host.value.clone();

		svg.add(it);
		it.stroke({ color: 'grey', width: 6});
		it.attr('stroke-linecap', 'round');
		it.after(host.value);

		it.off(); // clear all event handlers coming from the host

		super(it, leftMouseDown$);

		this.attrs.next({x: <number>it.x(), y: <number>it.y()});
		this.listenForCoordDiffs(host.coordDiffs);
	}
}

export const getVertexPointsCoords = (
  el: Line | Rect | Circle
): Array<PointMetadata> =>
  match(el.type)
    .with('rect', () => {
			const x = <number>el.x();
			const y = <number>el.y();
			const width = <number>el.width();
			const height = <number>el.height();

      return [
				{
					cx: x, 
					cy: y, 
				},
				{
					cx: x + width, 
					cy: y, 
				},
				{
					cx: x, 
					cy: y + height, 
				},
				{
					cx: x + width, 
					cy: y + height, 
				}
			];
    })
    .with('line', () => {
      return [
        {
          cx: el.attr('x1'),
          cy: el.attr('y1'),
        },
				{
					cx: el.attr('x2'), 
					cy: el.attr('y2'), 
				}
      ];
    })
		.run()
