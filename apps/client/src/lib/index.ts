import type { Svg, Rect, Line, Circle } from '@svgdotjs/svg.js';
import { match, P } from 'ts-pattern';

const baseColor = '#cdc';
const hoverColor = '#8a8';
// const eventNames: 'mousedown' | 'mouseup' | 'mousemove'

type LineEndpoint = {
	x2: number,
	y2: number
}

type PointCoords = {
	cx: number,
	cy: number
}

export interface ElVector {
	value: Line | Rect;

  /* 
		This function updates the element on transformations
	*/	
	update: (coords: LineEndpoint) => void;

	getVertexPointsCoords: () => Array<PointCoords>;
}

export class RectVector {

	value: Rect;

	constructor(svg: Svg, x: number, y: number) {

		this.value = svg.rect(100, 100).move(x, y).fill({color: baseColor});
		addGeneralBehavior(this.value);
	}
} 

export class LineVector implements ElVector {
	value: Line;

	constructor(
		svg: Svg, 
		x: number, 
		y: number
	) {
		this.value = svg.line(x, y, x, y)
			.stroke({ color: baseColor, width: 3});
		
		addGeneralBehavior(this.value);
	}

	update(coords: LineEndpoint) {
		this.value.attr({x2: coords.x2, y2: coords.y2});
	}

	getVertexPointsCoords() {
		const start = {cx: this.value.attr('x1'), cy: this.value.attr('y1')};
		const end = {cx: this.value.attr('x2'), cy: this.value.attr('y2')};

		return [start, end];
	}
}

export class VertexPoint {
	value: Circle;

	constructor(svg: Svg, cx: number, cy: number) {
		const point = svg.circle(8).center(cx, cy).fill('lightgrey');

		point.front();

		point.mouseover((event: MouseEvent) => {
			point.radius(5)
		});

		point.mouseout((event: MouseEvent) => {
			point.radius(4);
		});

		this.value = point;
	}
}

export const getVertexPointsCoords = (
  el: Line | Rect
): Array<PointCoords> =>
  match(el.type)
    .with('rect', () => {
			const x = <number>el.x();
			const y = <number>el.y();
			const width = <number>el.width();
			const height = <number>el.height();

      return [
				{cx: x, cy: y},
				{cx: x + width, cy: y},
				{cx: x, cy: y + height},
				{cx: x + width, cy: y + height}
			];
    })
    .with('line', () => {
      const start = { cx: el.attr('x1'), cy: el.attr('y1') };
      const end = { cx: el.attr('x2'), cy: el.attr('y2') };

      return [start, end];
    })
		.run()

function addGeneralBehavior(el: Rect | Line) {
	el.mouseover(() => {
		el.fill({color: hoverColor});
		el.stroke({color: hoverColor});
	});

	let mouseX: number;
	let mouseY: number;
	let prevMouseX: number;
	let prevMouseY: number;

	el.mousemove((event: MouseEvent) => {

		mouseX = event.pageX;
		mouseY = event.pageY;

		if (leftMouseDown) {
			const mouseDeltaX = mouseX - prevMouseX;
			const mouseDeltaY = mouseY - prevMouseY;

			el.dmove(mouseDeltaX, mouseDeltaY);
		}

		prevMouseX = mouseX;
		prevMouseY = mouseY;
	});

	let leftMouseDown = false;

	el.mousedown((event: MouseEvent) => {
		if (event.button === 0) {
			leftMouseDown = true;
		}
	});

	el.mouseup(() => {
		leftMouseDown = false;
	});

	el.mouseout((event: MouseEvent) => {

		const rTar = event.relatedTarget as HTMLElement;

		if (leftMouseDown && rTar.nodeName !== 'HTML') {
			// runs when dragging and the cursor "escapes" the area of the element
			mouseX = event.pageX;
			mouseY = event.pageY;

			const mouseDeltaX = mouseX - prevMouseX;
			const mouseDeltaY = mouseY - prevMouseY;

			el.dmove(mouseDeltaX, mouseDeltaY);

			prevMouseX = mouseX;
			prevMouseY = mouseY;
		} else {
			el.fill({ color: baseColor});
			el.stroke({color: baseColor});
			leftMouseDown = false;
		}
	});
}
