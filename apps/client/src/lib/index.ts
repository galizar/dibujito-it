import type { Svg, Rect, Line, Circle } from '@svgdotjs/svg.js';
import { 
	Observable, 
	Subject,
	BehaviorSubject, 
	takeUntil,
	startWith,
	merge,
	repeat,
	sample,
	type Subscription,
	combineLatestWith,
	take,
	finalize
} from 'rxjs';
import { match, P } from 'ts-pattern';

const baseColor = '#cdc';
const hoverColor = '#8a8';

type ElVectorAttrs = 
	| RectAttributes
	| LineAttributes
	| VtxPointAttrs
	| OutlineElAttrs;

type ElVectorAttrs$ =
	| Observable<RectAttributes>
	| Observable<LineAttributes>
  | Observable<VtxPointAttrs>
  | Observable<OutlineElAttrs>;

export type DibitElement =
	| ElVector<RectAttributes>
	| ElVector<LineAttributes>
	| ElVector<VtxPointAttrs>
	| ElVector<OutlineElAttrs>

type CoordDiffs = {dx: number, dy: number};

export abstract class ElVector<TAttrs> {
	value: Line | Rect | Circle;
	abstract attrs: TAttrs;
	abstract attrs$: BehaviorSubject<TAttrs>;
	/** stream of position differentials */
	coordDiffs$: BehaviorSubject<CoordDiffs> = new BehaviorSubject({dx: 0, dy: 0});
	select$ = new Subject<void>();
	deselect$ = new Subject<void>();
	destroy$ = new Subject<void>();
	moved$ = new Subject<void>();
 	/**  
	 * used to indicate when the element is updating itself from *within*;
	 * should not emit for updates triggered by external events (e.g. by
	 * addStreamListener or listenForCoordDiffs)
	 */
	selfUpdate$ = new Subject<void>();
	leftMouseDown = false;

	constructor(
		el: Line | Rect | Circle,
	) {
		this.value = el;

		this.moved$.subscribe(
			() => this.updatePositionAttributes(positionAttributeNames(el))
		);
  }

	abstract getVertexPoints(
		svg: Svg, 
		mouseCoordDiffs$: Observable<CoordDiffs>, 
		clickUp$: Observable<void>
	): Array<VertexPoint>;

	/**
	 *  Used to update the element's attributes based on a source stream and a
	 *  mapping function.
	 * 
	 * @param sourceStream 
	 * @param mapperFunction 
	 * @param options
	 * @param sample$ - optional signal for selective listening.
	 * @param stop$ - optional subscription-stopping signal. subscriptions stop by
	 * default on this.destroy$
	 */
	addStreamListener<TStream>(
		sourceStream: Observable<TStream>,
		mapperFunction: (stream: TStream) => Partial<ElVectorAttrs>,
		options: {
			sample$?: Observable<void>,
			stop$: Observable<void>
		} = { stop$: new Observable<void>()}
	) {
    sourceStream
			.pipe(
				takeUntil(merge(this.destroy$, options.stop$)),
				sample(options.sample$ ?? sourceStream)
			)
		  .subscribe((stream) => {
        const mappedAttrs = mapperFunction(stream);

        this.value.attr(mappedAttrs);
				this.attrs$.next((this.attrs = {...this.attrs, ...mappedAttrs}));
      });
	}

	/**
	 * Used to mimic the movement of other elements.
	 * 
	 * @param diffsStream - a position differentials stream
	 * @param samplingSignal - optional signal for selective listening.
	 * @param axis - optional string to indicate which axis to update. by default
	 * both axis are updated
	 */
	listenForCoordDiffs(
		diffsStream: Observable<CoordDiffs>,
		samplingSignal?: Subject<void>,
		axis?: 'x' | 'y'
	) {
    diffsStream
			.pipe(
				takeUntil(this.destroy$),
				sample(samplingSignal ?? diffsStream)
			)
			.subscribe(({ dx, dy }) => {
				if (axis === 'x') dy = 0;
				if (axis === 'y') dx = 0;

				this.value.dmove(dx, dy)
				this.coordDiffs$.next({dx, dy});
				this.moved$.next();
			});
	}
  
	/** 
	 * updates the position attributes in this.attrs$ to match with the
	 * current position of the element (this.value) 
	 * */
	updatePositionAttributes(
		attributeNames: Array<string>
	) {
		let newPosition = Object.create(null);
		for (const attr of attributeNames) {
			const newValue = <number>this.value.attr(attr);
			newPosition[attr] = newValue;
		}

		this.updateAttributes(newPosition);
	}

	/* updates the instance's attrs$ stream */
	updateAttributes(attrs: Partial<TAttrs>) {
		this.attrs$.next((this.attrs = {...this.attrs, ...attrs}));
	}

	select() {
		this.select$.next();
	}

	deselect() {
		this.deselect$.next();
	}

	onDestroy() {
		this.destroy$.next();
	}

	addColorChangeOnHover(baseColor: string, onHoverColor: string) {
		this.value.mouseover(() => {
			this.value.fill(onHoverColor);
			this.value.stroke(onHoverColor);
		});

		this.value.mouseout(() => {
			this.value.fill(baseColor);
			this.value.stroke(baseColor);
		});
	}

	addDraggingBehavior(
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	) {
		const innerMouseDown$ = new Subject<void>();
		const initialStop = new Subject<void>();

		clickUp$ = merge(clickUp$, initialStop.asObservable());

		mouseCoordDiffs$.pipe(
			takeUntil(clickUp$),
			repeat({ delay: () => innerMouseDown$})
		).subscribe(({dx, dy}) => {

      this.value.dmove(dx, dy);
      this.coordDiffs$.next({ dx, dy });
			this.moved$.next();
			this.selfUpdate$.next();
		});

		initialStop.next();

		this.value.mousedown(() => {
			innerMouseDown$.next();
		});
  }
}

type RectAttributes = {
	x: number,
	y: number,
	width: number,
	height: number
}

export class RectVector extends ElVector<RectAttributes> {

	attrs = {x: -1, y: -1, width: -1, height: -1};
	attrs$ = new BehaviorSubject(this.attrs);

	constructor(
		svg: Svg, 
		x: number, y: number,
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	) {
		const baseWidth = 100;
		const baseHeight = 100;

		const it = svg.rect(baseWidth, baseHeight)
			.move(x, y)
			.fill({color: baseColor});
		
		super(it);

		this.addDraggingBehavior(mouseCoordDiffs$, clickUp$);
		this.addColorChangeOnHover(baseColor, hoverColor);

		this.attrs$.next((this.attrs = {x, y, width: baseWidth, height: baseHeight}));
	}

	getVertexPoints(
		svg: Svg, 
		mouseCoordDiffs$: Observable<CoordDiffs>, 
		clickUp$: Observable<void>
	): Array<VertexPoint> {

		const x = <number>this.value.x();
		const y = <number>this.value.y();
		const width = <number>this.value.width();
		const height = <number>this.value.height();

		const tl = new VertexPoint(x,         y, svg, this, mouseCoordDiffs$, clickUp$);
    const tr = new VertexPoint(x + width, y, svg, this, mouseCoordDiffs$, clickUp$);
    const br = new VertexPoint(x + width, y + height, svg, this, mouseCoordDiffs$, clickUp$);
    const bl = new VertexPoint(x,         y + height, svg, this, mouseCoordDiffs$, clickUp$);

		// -- top-left connections
		tl.listenForCoordDiffs(tr.coordDiffs$, tr.selfUpdate$, 'y');
		tl.listenForCoordDiffs(bl.coordDiffs$, bl.selfUpdate$, 'x');
		this.addStreamListener(
			tl.coordDiffs$, 
			({dx, dy}) => ({ 
				x: this.attrs.x + dx,
				y: this.attrs.y + dy,
				width: this.attrs.width - dx, 
				height: this.attrs.height - dy 
			}), 
			{
				sample$: tl.selfUpdate$,
				stop$: tl.destroy$
			});


		// -- top-right connections
		tr.listenForCoordDiffs(br.coordDiffs$, br.selfUpdate$, 'x' );
		tr.listenForCoordDiffs(tl.coordDiffs$, tl.selfUpdate$, 'y')
		this.addStreamListener(
			tr.coordDiffs$, 
			({dx, dy}) => ({
				y: this.attrs.y + dy, 
				width: this.attrs.width + dx, 
				height: this.attrs.height - dy
			}), 
			{
				sample$: tr.selfUpdate$,
				stop$: tr.destroy$
			});

		// -- bottom-right connections
		br.listenForCoordDiffs(tr.coordDiffs$, tr.selfUpdate$, 'x');
		br.listenForCoordDiffs(bl.coordDiffs$, bl.selfUpdate$, 'y' );
		this.addStreamListener(
			br.coordDiffs$, 
			({dx, dy}) => ({ 
				width: this.attrs.width + dx, 
				height: this.attrs.height + dy 
			}), 
			{
				sample$: br.selfUpdate$,
				stop$: br.destroy$
			});

		// -- bottom-left connections
		bl.listenForCoordDiffs(tl.coordDiffs$, tl.selfUpdate$, 'x');
		bl.listenForCoordDiffs(br.coordDiffs$, br.selfUpdate$, 'y');
		this.addStreamListener(
			bl.coordDiffs$, 
			({dx, dy}) => ({ 
				x: this.attrs.x + dx,
				width: this.attrs.width - dx, 
				height: this.attrs.height + dy 
			}), 
			{
				sample$: bl.selfUpdate$,
				stop$: bl.destroy$
			});

		return [tl, tr, br, bl];
	}
} 

type LineAttributes = {
	x1: number,
	y1: number,
	x2: number,
	y2: number
}

export class LineVector extends ElVector<LineAttributes> {

	attrs = {x1: -1, y1: -1, x2: -1, y2: -1};
	attrs$ = new BehaviorSubject(this.attrs);

	constructor(
		svg: Svg, 
		x: number, 
		y: number,
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	) {

		const it = svg.line(x, y, x, y)
			.stroke({ color: baseColor, width: 3});
		
		super(it);

		this.addDraggingBehavior(mouseCoordDiffs$, clickUp$);
		this.addColorChangeOnHover(baseColor, hoverColor);

		this.attrs$.next({x1: x, y1: y, x2: x, y2: y});
	}

	getVertexPoints(
		svg: Svg, 
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	): VertexPoint[] {
		return [];
	}
}

type VtxPointAttrs = {
	cx: number,
	cy: number
}

export class VertexPoint extends ElVector<VtxPointAttrs> {

	attrs = {cx: -1, cy: -1};
	attrs$ = new BehaviorSubject(this.attrs);

	constructor(
		cx: number, 
		cy: number, 
		svg: Svg,
		host: DibitElement,
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	) {
		const it = svg.circle(8).center(cx, cy).fill('lightgrey');

		it.front();

		it.mouseover((event: MouseEvent) => {
			it.radius(5)
		});

		it.mouseout((event: MouseEvent) => {
			it.radius(4);
		});

		super(it);

		this.addDraggingBehavior(mouseCoordDiffs$, clickUp$);

		this.attrs$.next((this.attrs = {cx, cy}));
		this.listenForCoordDiffs(host.coordDiffs$, host.selfUpdate$);
	}

	getVertexPoints(
		svg: Svg, 
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	): VertexPoint[] {
		return [];
	}
}

type OutlineElAttrs = {
	x: number,
	y: number,
}

export class OutlineElement extends ElVector<OutlineElAttrs> {

	attrs = {x: -1, y: -1};
	attrs$ = new BehaviorSubject(this.attrs);

	constructor(
		host: DibitElement, 
		svg: Svg,
	) {
		const it = host.value.clone();

		svg.add(it);
		it.stroke({ color: 'grey', width: 6});
		it.attr('stroke-linecap', 'round');
		it.after(host.value);

		it.off(); // clear all event handlers coming from the host

		super(it);

		this.attrs$.next({x: <number>it.x(), y: <number>it.y()});
		this.addTransformationsListener(host);
	}

	getVertexPoints(
		svg: Svg, 
		mouseCoordDiffs$: Observable<CoordDiffs>,
		clickUp$: Observable<void>
	): VertexPoint[] {
		return [];
	}

	addTransformationsListener(host: DibitElement) {
		merge(host.coordDiffs$, host.attrs$)
			.subscribe(() => {
				this.value.attr(host.value.attr());
				this.value.stroke({ color: 'grey', width: 6});
				this.value.attr('stroke-linecap', 'round');
			});
	}
}

const positionAttributeNames = (
	el: Line | Rect | Circle
): Array<string> =>
	match(el.type)
		.with('rect', () => ['x', 'y'])
		.with('line', () => ['x1', 'y1', 'x2', 'y2'])
		.with('circle', () => ['cx', 'cy'])
		.run();

export const getVertexPointsCoords = (
  el: Line | Rect | Circle
): Array<{cx: number, cy: number}> =>
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
