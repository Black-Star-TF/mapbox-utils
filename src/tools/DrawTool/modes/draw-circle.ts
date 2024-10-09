import Mode, { type Data } from './mode'
import { point, distance, circle } from '@turf/turf'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
import mapboxgl from 'mapbox-gl'
export default class DrawCircle extends Mode {
	private _center?: [number, number]
	private _control?: [number, number]
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		setCursorClass(map, CURSORS.CROSSHAIR, true)
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	private _render() {
		const features: GeoJSON.Feature[] = []
		let centerPoint
		let controlPoint
		if (this._center) {
			centerPoint = point(this._center)
			features.push(centerPoint)
		}

		if (this._control) {
			controlPoint = point(this._control)
			features.push(controlPoint)
		}

		if (centerPoint && controlPoint) {
			features.push(circle(centerPoint, distance(centerPoint, controlPoint), { steps: 128 }))
		}
		this._ev?.fire('render', { features })
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		if (!this._center) {
			this._center = [e.lngLat.lng, e.lngLat.lat]
			this._render()
		} else if (this._control) {
			this._control = [e.lngLat.lng, e.lngLat.lat]
			const centerPoint = point(this._center)
			const controlPoint = point(this._control)
			this._ev?.fire('add', {
				geometry: circle(centerPoint, distance(centerPoint, controlPoint), { steps: 128 }).geometry
			})
			this._center = undefined
			this._control = undefined
		}
	}

	onMousemove(e: mapboxgl.MapMouseEvent): void {
		if (this._center) {
			this._control = [e.lngLat.lng, e.lngLat.lat]
			this._render()
		}
	}

	destroy(): void {
		this._center = undefined
		this._control = undefined
		this._render()
		setCursorClass(this._map, CURSORS.CROSSHAIR, false)
		super.destroy()
	}
}
