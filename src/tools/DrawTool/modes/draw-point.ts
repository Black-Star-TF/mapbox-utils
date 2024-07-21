import mapboxgl from 'mapbox-gl'
import Mode from './mode'
import { point } from '@turf/turf'
import { setCursorClass, getCursorClass } from '../../../utils'
const CURSOR_CLASS = getCursorClass('crosshair')
export default class DrawPoint extends Mode {
	constructor(map: mapboxgl.Map) {
		super(map)
		setCursorClass(map, CURSOR_CLASS, true)
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		this._ev?.fire('add', { geometry: point([e.lngLat.lng, e.lngLat.lat]).geometry })
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	destroy(): void {
		this._map && setCursorClass(this._map, CURSOR_CLASS, false)
		super.destroy()
	}
}
