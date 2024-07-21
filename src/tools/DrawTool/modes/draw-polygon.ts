import mapboxgl from 'mapbox-gl'
import Mode from './mode'
import { point, polygon, lineString } from '@turf/turf'
import { setCursorClass, getCursorClass } from '../../../utils'
const CURSOR_CLASS = getCursorClass('crosshair')
export default class DrawPolygon extends Mode {
	private _vertices: Array<[number, number]>
	private _currentVertex?: [number, number]
	constructor(map: mapboxgl.Map) {
		super(map)
		setCursorClass(map, CURSOR_CLASS, true)
		this._vertices = []
	}

	private _render() {
		const features: GeoJSON.Feature[] = []
		this._vertices.forEach((vertex) => {
			features.push(point(vertex, { active: true }))
		})
		const fullVertices = getFullVertices(this._vertices, this._currentVertex)
		if (fullVertices.length >= 3) {
			features.push(polygon([[...fullVertices, fullVertices[0]]], { active: true }))
		}
		if (fullVertices.length >= 2) {
			features.push(lineString([...fullVertices, fullVertices[0]], { active: true }))
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
		if (this._vertices.length >= 3) {
			this._ev?.fire('add', {
				geometry: polygon([[...this._vertices, this._vertices[0]]]).geometry
			})
			this._currentVertex = undefined
			this._vertices = []
		}
	}

	onOriginDblclick(e: mapboxgl.MapMouseEvent): void {
		e.preventDefault()
	}

	destroy(): void {
		this._vertices = []
		this._currentVertex = undefined
		this._render()
		this._map && setCursorClass(this._map, CURSOR_CLASS, false)
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
