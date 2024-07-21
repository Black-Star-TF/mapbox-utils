import mapboxgl from 'mapbox-gl'
import Mode from './mode'
import { point } from '@turf/turf'
export default class DrawPoint extends Mode {
	constructor() {
		super()
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
		this._ev?.fire('add', { geometry: point([e.lngLat.lng, e.lngLat.lat]).geometry })
	}
}
