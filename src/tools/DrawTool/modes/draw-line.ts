import mapboxgl from 'mapbox-gl'
import Mode, { type Data } from './mode'
import { point, lineString } from '@turf/turf'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
export default class DrawLine extends Mode {
	private _vertices: Array<[number, number]>
	private _currentVertex?: [number, number]
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		setCursorClass(map, CURSORS.CROSSHAIR, true)
		this._vertices = []
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	private _render() {
		const features: GeoJSON.Feature[] = []
		this._vertices.forEach((vertex) => {
			features.push(point(vertex, { active: true }))
		})
		const fullVertices = getFullVertices(this._vertices, this._currentVertex)
		if (fullVertices.length >= 2) {
			features.push(lineString(fullVertices, { active: true }))
		}
		this._ev?.fire('render', { features })
	}

	onClick(e: mapboxgl.MapMouseEvent): void {
		this._vertices.push([e.lngLat.lng, e.lngLat.lat])
		this._currentVertex = undefined
		this._render()
	}

	onMousemove(e: mapboxgl.MapMouseEvent): void {
		this._currentVertex = [e.lngLat.lng, e.lngLat.lat]
		this._render()
	}

	onDblclick(_e: mapboxgl.MapMouseEvent): void {
		if (this._vertices.length >= 2) {
			this._ev?.fire('add', { geometry: lineString(this._vertices).geometry })
			this._currentVertex = undefined
			this._vertices = []
		}
	}

	destroy(): void {
		this._vertices = []
		this._currentVertex = undefined
		this._render()
		setCursorClass(this._map, CURSORS.CROSSHAIR, false)
		super.destroy()
	}
}

function getFullVertices(vertices: Array<[number, number]>, lastVertex?: [number, number]) {
	const fillVertices = [...vertices]
	if (lastVertex) {
		fillVertices.push(lastVertex)
	}
	return fillVertices
}
