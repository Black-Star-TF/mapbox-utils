import mapboxgl from 'mapbox-gl'
import Mode, { type Data } from './mode'
import { point } from '@turf/turf'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
export default class DrawPoint extends Mode {
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		setCursorClass(map, CURSORS.CROSSHAIR, true)
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		this._ev?.fire('add', { geometry: point([e.lngLat.lng, e.lngLat.lat]).geometry })
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	destroy(): void {
		setCursorClass(this._map, CURSORS.CROSSHAIR, false)
		super.destroy()
	}
}
