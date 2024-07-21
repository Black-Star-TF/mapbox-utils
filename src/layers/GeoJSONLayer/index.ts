import mapboxgl from 'mapbox-gl'
import {
	getId,
	bindAll,
	isNotNull,
	nanoid,
	getLayerId,
	combineFilters,
	queryRendererFeaturesBySource
} from '../../utils'
import Event from '../../utils/Event'
import { bboxPolygon, bbox, featureCollection, feature } from '@turf/turf'
const CURSOR_CLASS = 'mapbox-utils-layer-hover'
export type DisabledProperty = 'source' | 'source-layer' | 'id'
type LayerType =
	| mapboxgl.CircleLayer
	| mapboxgl.SymbolLayer
	| mapboxgl.LineLayer
	| mapboxgl.FillLayer
	| mapboxgl.HeatmapLayer
	| mapboxgl.FillExtrusionLayer

type LayerOption =
	| Omit<mapboxgl.CircleLayer, DisabledProperty>
	| Omit<mapboxgl.SymbolLayer, DisabledProperty>
	| Omit<mapboxgl.LineLayer, DisabledProperty>
	| Omit<mapboxgl.FillLayer, DisabledProperty>
	| Omit<mapboxgl.HeatmapLayer, DisabledProperty>
	| Omit<mapboxgl.FillExtrusionLayer, DisabledProperty>
type LayerPool = Record<string, LayerOption>
type Data = Map<any, { geometry: GeoJSON.Geometry; properties: any }>

export type EventType = 'click' | 'mousemove' | 'mouseenter' | 'mouseleave'
export type EventData = {
	geometry: GeoJSON.Geometry
	properties: any
	originMapEvent: mapboxgl.MapMouseEvent
}
export interface Events {
	click: EventData
	mousemove: EventData
	mouseenter: EventData
	mouseleave: EventData
}
export interface Options {
	key?: string
	lineMetrics?: boolean
	layerPool: LayerPool
	layers: string[]
	fitBoundsOptions?: boolean | mapboxgl.FitBoundsOptions
}
export default class GeoJSONLayer {
	protected _sourceId: string
	protected _key?: string
	protected _map: mapboxgl.Map | null
	protected _layerPool: LayerPool
	protected _data: Data
	protected _layers: string[]
	protected _beforeId?: string
	protected _lngLatBounds: mapboxgl.LngLatBoundsLike | null
	protected _fitBoundsOptions: boolean | mapboxgl.FitBoundsOptions
	protected _ev: Event | null
	protected _isMouseOver: boolean
	protected _lineMetrics: boolean
	constructor(options: Options) {
		this._map = null
		this._sourceId = getId('geojson')
		this._data = new Map()
		this._ev = new Event()
		this._lineMetrics = options.lineMetrics || false
		this._key = isNotNull(options.key) ? options.key : undefined
		this._layerPool = options.layerPool || {}
		this._layers = options.layers?.slice() || []
		this._beforeId = undefined
		this._lngLatBounds = null
		this._fitBoundsOptions = options.fitBoundsOptions || false
		this._isMouseOver = false
		bindAll(['_onClick', '_onMouseMove', '_onMouseLeave', '_onStyleLoad', '_onContextmenu'], this)
	}

	get sourceId() {
		return this._sourceId
	}

	get layerIds() {
		return this._layers.map((layer) => getLayerId(this.sourceId, layer))
	}

	setData(data?: GeoJSON.Feature | GeoJSON.FeatureCollection) {
		if (data) {
			try {
				const bounds = bboxPolygon(bbox(data)).bbox!
				this._lngLatBounds = bounds.includes(Infinity)
					? null
					: (bounds as mapboxgl.LngLatBoundsLike)

				this._data.clear()
				if (data.type === 'FeatureCollection') {
					data.features.forEach((item: GeoJSON.Feature) => {
						const { id, properties, geometry } = extractFeature(item, this._key)
						this._data.set(id, { properties, geometry })
					})
				} else if (data.type === 'Feature') {
					const { id, properties, geometry } = extractFeature(data, this._key)
					this._data.set(id, { properties, geometry })
				}
			} catch (error) {
				console.warn('`data` is not valid geojson. \n', error)
			}
		} else {
			this._data.clear()
			this._lngLatBounds = null
		}
		this._isMouseOver = false
		const source = this._map?.getSource(this.sourceId) as mapboxgl.GeoJSONSource | null
		source?.setData(getSourceData(this._data))
		this._fitBounds()
		return this
	}

	addTo(map: mapboxgl.Map, beforeId?: string) {
		if (this._map === map) return
		this.remove()
		this._map = map
		this._beforeId = beforeId
		this._addSourceAndLayers()
		this._handleEventListener('on')
		this._fitBounds()
		return this
	}

	remove() {
		if (this._map) {
			this._handleEventListener('off')
			this._removeSourceAndLayers()
			this._setCursorClass(false)
		}
		this._map = null
		this._beforeId = undefined
		this._isMouseOver = false
		return this
	}

	fitBounds(options?: mapboxgl.FitBoundsOptions) {
		if (this._map && this._lngLatBounds) {
			options = options || typeof this._fitBoundsOptions === 'boolean' ? {} : this._fitBoundsOptions
			this._map?.fitBounds(this._lngLatBounds, {
				...options
			})
		}
		return this
	}

	getFeature(id: any) {
		return this._data.get(id)
	}

	on<T extends EventType>(type: T, fn: (e: Events[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}

	protected _getAllLayers() {
		return [...this.layerIds]
	}

	protected _setCursorClass(bool: boolean) {
		if (!this._map) return
		const hasCursorClass = this._map.getContainer().classList.contains(CURSOR_CLASS)
		if (bool && !hasCursorClass) {
			this._map.getContainer().classList.add(CURSOR_CLASS)
		} else if (!bool && hasCursorClass) {
			this._map.getContainer().classList.remove(CURSOR_CLASS)
		}
	}

	protected _handleEventListener(type: 'on' | 'off') {
		if (!this._map) return
		this._map[type]('style.load', this._onStyleLoad)
		this._map[type]('click', this._onClick)
		this._map[type]('contextmenu', this._onContextmenu)
		this._map[type]('mousemove', this._onMouseMove)
		if (type === 'on') {
			this._map.getContainer().addEventListener('mouseleave', this._onMouseLeave)
		} else {
			this._map.getContainer().removeEventListener('mouseleave', this._onMouseLeave)
		}
	}

	protected _onStyleLoad() {
		this._addSourceAndLayers()
	}

	protected _onClick(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (!feature) return
		// 触发点击事件
		const { geometry, properties } = this._data.get(feature.properties!.id)!
		this._ev?.fire('click', {
			originEvent: e,
			geometry: JSON.parse(JSON.stringify(geometry)),
			properties
		})
	}

	protected _onContextmenu(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (!feature) return
		// 触发点击事件
		const { geometry, properties } = this._data.get(feature.properties!.id)!
		this._ev?.fire('contextmenu', {
			originEvent: e,
			geometry: JSON.parse(JSON.stringify(geometry)),
			properties
		})
	}

	protected _onMouseMove(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (feature) {
			const { geometry, properties } = this._data.get(feature.properties!.id)!
			const event = {
				originEvent: e,
				geometry: JSON.parse(JSON.stringify(geometry)),
				properties
			}
			if (this._isMouseOver) {
				this._ev?.fire('mousemove', event)
			} else {
				this._ev?.fire('mouseenter', event)
				this._isMouseOver = true
			}
			this._setCursorClass(true)
		} else {
			this._setCursorClass(false)
		}
	}

	protected _onMouseLeave() {
		if (this._isMouseOver) {
			this._isMouseOver = false
			this._ev?.fire('mouseleave')
		}
		this._setCursorClass(false)
	}

	protected _getSourceOption(): mapboxgl.GeoJSONSourceRaw {
		return {
			data: getSourceData(this._data),
			type: 'geojson',
			promoteId: 'id',
			lineMetrics: this._lineMetrics
		}
	}

	protected _removeSourceAndLayers() {
		if (!this._map) return
		const map = this._map
		this._getAllLayers().forEach((layerId) => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId)
			}
		})

		if (map.getSource(this.sourceId)) {
			map.removeSource(this.sourceId)
		}
	}

	protected _addSourceAndLayers() {
		// @ts-expect-error 通过map.style._loaded判断style是否加载，当style加载完成后就可以添加图层了。
		if (!this._map || !this._map.style?._loaded) return
		const map = this._map
		map.addSource(this.sourceId, this._getSourceOption())
		this._getLayers().forEach(([id, layerOption, filters]) => {
			addLayer(map, this.sourceId, { ...layerOption, id }, filters, this._beforeId)
		})
	}

	protected _getLayers() {
		const fullLayers: Array<[string, LayerOption, any[]]> = []
		this._layers.forEach((layer) => {
			fullLayers.push([getLayerId(this.sourceId, layer), this._layerPool[layer], []])
		})
		return fullLayers
	}

	protected _fitBounds() {
		if (!this._map) return
		if (!this._fitBoundsOptions || !this._lngLatBounds) return
		const fitBoundsOptions = this._fitBoundsOptions === true ? undefined : this._fitBoundsOptions
		this._map?.fitBounds(this._lngLatBounds, fitBoundsOptions)
	}
}

function addLayer(
	map: mapboxgl.Map,
	sourceId: string,
	layerOption: LayerOption & { id: string },
	filters: any[] = [],
	beforeId?: string
) {
	if (map.getLayer(layerOption.id)) return
	const filter = combineFilters(filters, layerOption.filter)
	const layerOptions: LayerType = {
		...layerOption,
		source: sourceId
	}
	filter && (layerOptions.filter = filter)
	map.addLayer(layerOptions, beforeId)
}

function extractFeature(feature: GeoJSON.Feature, key?: string) {
	const properties = feature.properties || {}
	const id = key && isNotNull(properties[key]) ? properties[key] : nanoid()
	return {
		id,
		geometry: feature.geometry,
		properties
	}
}

function getSourceData(data: Data) {
	const features: GeoJSON.Feature[] = []
	data.forEach(({ geometry }, id) => {
		features.push(feature(geometry, { id }))
	})
	return featureCollection(features)
}
