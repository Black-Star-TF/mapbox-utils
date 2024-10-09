import Mode, { type Data } from './mode'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
import { point, bbox, bboxPolygon, featureCollection } from '@turf/turf'
export default class DrawRect extends Mode {
	private _control1?: [number, number]
	private _control2?: [number, number]
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		setCursorClass(map, CURSORS.CROSSHAIR, true)
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	private _render() {
		const features: GeoJSON.Feature[] = []
		let controlPoint1
		let controlPoint2
		if (this._control1) {
			controlPoint1 = point(this._control1)
			features.push(controlPoint1)
		}

		if (this._control2) {
			controlPoint2 = point(this._control2)
			features.push(controlPoint2)
		}

		if (controlPoint1 && controlPoint2) {
			features.push(bboxPolygon(bbox(featureCollection([controlPoint1, controlPoint2]))))
		}
		this._ev?.fire('render', { features })
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		if (!this._control1) {
			this._control1 = [e.lngLat.lng, e.lngLat.lat]
			this._render()
		} else if (this._control2) {
			this._control2 = [e.lngLat.lng, e.lngLat.lat]
			const controlPoint1 = point(this._control1)
			const controlPoint2 = point(this._control2)
			this._ev?.fire('add', {
				geometry: bboxPolygon(bbox(featureCollection([controlPoint1, controlPoint2]))).geometry
			})
			this._control1 = undefined
			this._control2 = undefined
		}
	}

	onMousemove(e: mapboxgl.MapMouseEvent): void {
		if (this._control1) {
			this._control2 = [e.lngLat.lng, e.lngLat.lat]
			this._render()
		}
	}

	destroy(): void {
		this._control1 = undefined
		this._control2 = undefined
		this._render()
		setCursorClass(this._map, CURSORS.CROSSHAIR, false)
		super.destroy()
	}
}
