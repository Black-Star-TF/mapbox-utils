import Event from '../../../utils/Event'
type EventType = 'render' | 'add'
type Events = {
	render: {
		features: Array<GeoJSON.Feature>
	}
	add: {
		geometry: GeoJSON.Geometry
	}
}
export default class Mode {
	protected _ev: Event | null
	constructor() {
		this._ev = new Event()
	}

	on<T extends EventType>(type: T, fn: (e: Events[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}

	onClick(_e: mapboxgl.MapMouseEvent) {
		// console.log('click')
	}

	onDblclick(_e: mapboxgl.MapMouseEvent) {
		// console.log('dblclick')
	}

	onDrag(_e: mapboxgl.MapMouseEvent) {
		// console.log('drag')
	}

	onMousemove(_e: mapboxgl.MapMouseEvent) {
		// console.log('mousemove')
	}

	onMousedown(_e: mapboxgl.MapMouseEvent) {
		// console.log('mousedown')
	}

	onMouseup(_e: mapboxgl.MapMouseEvent) {
		// console.log('mouseup')
	}

	destroy() {
		this._ev = null
	}
}
