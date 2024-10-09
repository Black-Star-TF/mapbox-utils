import mapboxgl from 'mapbox-gl'
import Mode, { type Data } from './mode'
import { setCursorClass } from '../../../utils'
import { CURSORS } from '../../../utils/constants'
export default class Select extends Mode {
	private selected: Set<string> | null
	constructor(map: mapboxgl.Map, data: Data) {
		super(map, data)
		this.selected = new Set()
	}

	onClick(_e: mapboxgl.MapMouseEvent, feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		if (feature) {
			const id = feature.id as string
			if (this.selected?.has(id)) {
				this.selected?.delete(id)
				this._ev?.fire('unselect', { id })
			} else {
				this.selected?.add(id)
				this._ev?.fire('select', { id })
			}
		}
	}

	onMousemove(_e: mapboxgl.MapMouseEvent, feature: mapboxgl.MapboxGeoJSONFeature | undefined) {
		if (feature) {
			setCursorClass(this._map, CURSORS.POINTER, true)
		} else {
			setCursorClass(this._map, CURSORS.POINTER, false)
		}
	}

	destroy(): void {
		this._ev?.fire('clear-select')
		super.destroy()
		this.selected?.clear()
		this.selected = null
	}
}
