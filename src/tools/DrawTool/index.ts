import type mapboxgl from 'mapbox-gl'
import Event from '../../utils/Event'
import { getId, bindAll, nanoid } from '../../utils'
import isClick from '../../utils/isClick'
import isDblclick from '../../utils/isDblclick'
import Mode from './modes/mode'
import DrawPoint from './modes/draw-point'
import layers, { LayerOptions } from './layers'
import { feature, featureCollection } from '@turf/turf'
type Data = Map<string, GeoJSON.Geometry>
type Options = {
	layers?: Array<LayerOptions>
}
export default class DrawTool {
	protected _map: mapboxgl.Map | null
	protected _ev: Event | null
	private _sourceId: string
	private _currentMode: Mode
	private _mousedownInfo?: { timestamp: number; point: mapboxgl.Point }
	private _clickInfo?: { timestamp: number; point: mapboxgl.Point }
	private _data: Data
	private _features: Array<GeoJSON.Feature>
	private _layers: Array<LayerOptions>
	constructor(options?: Options) {
		this._map = null
		this._data = new Map()
		this._layers = options?.layers || layers
		this._features = []
		this._updateFeatures()
		this._sourceId = getId('draw-tool')
		this._ev = new Event()
		this._currentMode = new Mode()
		this._mousedownInfo = undefined
		this._clickInfo = undefined
		bindAll(['_onStyleLoad', '_onMousedown', '_onMouseup', '_onMousemove'], this)
	}

	changeMode() {
		this._currentMode?.destroy()
		this._currentMode = new DrawPoint()
		this._currentMode.on('add', (e) => {
			this._data.set(nanoid(), e.geometry)
			this._updateFeatures()
			this._render()
		})
	}

	addTo(map: mapboxgl.Map) {
		if (this._map === map) return
		this.remove()
		this._map = map
		this._addSourceAndLayers()
		this._handleEventListener('on')
		return this
	}

	remove() {
		if (this._map) {
			this._handleEventListener('off')
			this._removeSourceAndLayers()
		}
		this._map = null
		return this
	}

	private _updateFeatures() {
		const features: GeoJSON.Feature[] = []
		this._data.forEach((geometry, id) => {
			features.push(feature(geometry, { id }))
		})
		this._features = features
	}

	private _render() {
		if (!this._map) return
		const source = this._map.getSource(this._sourceId) as mapboxgl.GeoJSONSource
		source.setData(featureCollection(this._features))
	}

	private _addSourceAndLayers() {
		// @ts-expect-error 通过map.style._loaded判断style是否加载，当style加载完成后就可以添加图层了。
		if (!this._map || !this._map.style?._loaded) return
		const map = this._map
		map.addSource(this._sourceId, {
			type: 'geojson',
			promoteId: 'id',
			data: featureCollection(this._features)
		})
		this._layers.forEach((layer) => {
			map.addLayer({
				...layer,
				source: this._sourceId
			})
		})
	}

	private _removeSourceAndLayers() {
		if (!this._map) return
		const map = this._map
		this._layers.forEach((layer) => {
			map.removeLayer(layer.id)
		})
		map.removeSource(this._sourceId)
	}

	private _handleEventListener(type: 'on' | 'off') {
		if (!this._map) return
		this._map[type]('style.load', this._onStyleLoad)
		this._map[type]('mousedown', this._onMousedown)
		this._map[type]('mouseup', this._onMouseup)
		this._map[type]('mousemove', this._onMousemove)
	}

	private _onStyleLoad() {
		this._addSourceAndLayers()
	}

	private _onMousedown(e: mapboxgl.MapMouseEvent) {
		this._mousedownInfo = {
			timestamp: new Date().getTime(),
			point: e.point
		}
		// 判断是单次点击还是双击
		this._currentMode.onMousedown(e)
	}

	private _onMouseup(e: mapboxgl.MapMouseEvent) {
		const mouseupInfo = {
			timestamp: new Date().getTime(),
			point: e.point
		}
		if (isClick(this._mousedownInfo!, mouseupInfo)) {
			if (isDblclick(mouseupInfo, this._clickInfo)) {
				this._clickInfo = undefined
				this._currentMode.onDblclick(e)
			} else {
				this._clickInfo = mouseupInfo
				this._currentMode.onClick(e)
			}
		} else {
			this._currentMode.onMouseup(e)
		}
	}

	private _onMousemove(e: mapboxgl.MapMouseEvent) {
		this._currentMode.onMousemove(e)
	}
}
