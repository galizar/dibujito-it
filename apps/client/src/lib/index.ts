import type { Svg, Rect, Line } from '@svgdotjs/svg.js';

const baseColor = '#cdc';
const hoverColor = '#8a8';
// const eventNames: 'mousedown' | 'mouseup' | 'mousemove'

type LineEndpoint = {
	x2: number,
	y2: number
}

export interface ElVector {
  /* 
		This function updates the element on transformations
	*/	
	value: Line | Rect;
	update: (coords: LineEndpoint) => void;
}

export class RectVector {

	value: Rect;

	constructor(draw: Svg, x: number, y: number) {

		this.value = draw.rect(100, 100).move(x, y).fill({color: baseColor});
		addGeneralBehavior(this.value);
	}
} 

export class LineVector implements ElVector {
	value: Line;

	/** 
	 * @param draw - The SVG
	 */
	constructor(
		draw: Svg, 
		x: number, 
		y: number
	) {
		this.value = draw.line(x, y, x, y)
			.stroke({ color: baseColor, width: 3});
		
		addGeneralBehavior(this.value);
	}

	update(coords: LineEndpoint) {
		this.value.attr({x2: coords.x2, y2: coords.y2});
	}
}

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
