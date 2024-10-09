import mapboxgl from 'mapbox-gl'
import Mode, { type Data } from './mode'
import { clone } from '@turf/turf'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
export default class Move extends Mode {
	private _moveFeatureId: string | null
	private _movingGeometry: GeoJSON.Geometry | null
	private _start: [number, number] | null
	private _end: [number, number] | null
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		this._start = null
		this._end = null
		this._movingGeometry = null
		this._moveFeatureId = null
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	onMousedown(e: mapboxgl.MapMouseEvent, feature: mapboxgl.MapboxGeoJSONFeature | undefined): void {
		if (feature) {
			this._moveFeatureId = feature.id as string
			this._movingGeometry = this._data!.get(this._moveFeatureId)!
			this._start = [e.lngLat.lng, e.lngLat.lat]
			this._ev?.fire('movestart', { id: this._moveFeatureId })
			e.preventDefault()
		}
	}

	onMouseup(e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined): void {
		if (this._moveFeatureId && this._start && this._movingGeometry) {
			this._end = [e.lngLat.lng, e.lngLat.lat]
			this._ev?.fire('moveend', {
				id: this._moveFeatureId,
				geometry: move(this._movingGeometry, this._start, this._end)
			})
		}
		this._start = null
		this._end = null
		this._moveFeatureId = null
		this._movingGeometry = null
	}

	onMousemove(e: mapboxgl.MapMouseEvent, feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		if (this._moveFeatureId && this._start && this._movingGeometry) {
			this._end = [e.lngLat.lng, e.lngLat.lat]
			this._ev?.fire('move', {
				id: this._moveFeatureId,
				geometry: move(this._movingGeometry, this._start, this._end)
			})
		}
		if (feature) {
			setCursorClass(this._map, CURSORS.MOVE, true)
		} else {
			setCursorClass(this._map, CURSORS.MOVE, false)
		}
	}

	destroy(): void {
		setCursorClass(this._map, CURSORS.MOVE, false)
		super.destroy()
		this._start = null
		this._end = null
		this._moveFeatureId = null
		this._movingGeometry = null
	}
}

// TODO: 平移算法优化
function move(geometry: GeoJSON.Geometry, start: [number, number], end: [number, number]) {
	const delta = [end[0] - start[0], end[1] - start[1]]
	const newGeometry = clone(geometry)
	if (newGeometry.type === 'Point') {
		newGeometry.coordinates[0] += delta[0]
		newGeometry.coordinates[1] += delta[1]
	} else if (newGeometry.type === 'MultiPoint' || newGeometry.type === 'LineString') {
		newGeometry.coordinates.forEach((item) => {
			item[0] += delta[0]
			item[1] += delta[1]
		})
	} else if (newGeometry.type === 'MultiLineString' || newGeometry.type === 'Polygon') {
		newGeometry.coordinates.forEach((item) => {
			item.forEach((item1) => {
				item1[0] += delta[0]
				item1[1] += delta[1]
			})
		})
	} else if (newGeometry.type === 'MultiPolygon') {
		newGeometry.coordinates.forEach((item) => {
			item.forEach((item1) => {
				item1.forEach((item2) => {
					item2[0] += delta[0]
					item2[1] += delta[1]
				})
			})
		})
	}
	return newGeometry
}
