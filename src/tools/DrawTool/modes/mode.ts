import mapboxgl from 'mapbox-gl'
import Event from '../../../utils/Event'
type EventType =
	| 'render'
	| 'add'
	| 'move'
	| 'move-start'
	| 'move-end'
	| 'select'
	| 'unselect'
	| 'clear-select'
type Events = {
	render: {
		features: Array<GeoJSON.Feature>
	}
	add: {
		geometry: GeoJSON.Geometry
	}
	'move-start': {
		id: string
	}
	move: {
		id: string
		geometry: GeoJSON.Geometry
	}
	'move-end': {
		id: string
		geometry: GeoJSON.Geometry
	}
	select: {
		id: string
	}
	unselect: {
		id: string
	}
	'clear-select': {}
}
export type Data = Map<string, GeoJSON.Geometry>
export default class Mode {
	protected _ev: Event | null
	protected _map: mapboxgl.Map | null
	protected _data: Data | null
	constructor(map: mapboxgl.Map, data: Data) {
		this._ev = new Event()
		this._map = map
		this._data = data
	}

	on<T extends EventType>(type: T, fn: (e: Events[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}

	onOriginDblclick(_e: mapboxgl.MapMouseEvent) {
		// console.log('origin-dblclick')
	}

	onClick(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('click')
	}

	onDblclick(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('dblclick')
	}

	onDrag(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('drag')
	}

	onMousemove(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('mousemove')
	}

	onMousedown(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('mousedown')
	}

	onMouseup(_e: mapboxgl.MapMouseEvent, _feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		// console.log('mouseup')
	}

	destroy() {
		this._ev = null
		this._map = null
	}
}
