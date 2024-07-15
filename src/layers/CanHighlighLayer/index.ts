import mapboxgl from 'mapbox-gl'
import { bindAll, isNotNull, nanoid } from '../../utils'
import { bboxPolygon, bbox, featureCollection, feature } from '@turf/turf'
import Event from '../../utils/Event'
const highlightTriggers = ['none', 'click', 'hover', 'manual'] as const
type HighlightTrigger = (typeof highlightTriggers)[number]
export type LayerOmitProperty = 'source' | 'source-layer' | 'id'
type AnyLayer =
	| mapboxgl.CircleLayer
	| mapboxgl.SymbolLayer
	| mapboxgl.LineLayer
	| mapboxgl.FillLayer
export type LayerType =
	| Omit<mapboxgl.CircleLayer, LayerOmitProperty>
	| Omit<mapboxgl.SymbolLayer, LayerOmitProperty>
	| Omit<mapboxgl.LineLayer, LayerOmitProperty>
	| Omit<mapboxgl.FillLayer, LayerOmitProperty>
type LayerPool = Record<string, LayerType>
export type CommonEventType = 'click' | 'mousemove' | 'mouseenter' | 'mouseleave'
export type EventFeatureData = {
	geometry: GeoJSON.Geometry
	properties: any
}
type CommonEvent = EventFeatureData & { originMapEvent: mapboxgl.MapMouseEvent }
export interface CommonEventMap {
	click: CommonEvent
	mousemove: CommonEvent
	mouseenter: CommonEvent
	mouseleave: CommonEvent
}
export interface Options {
	key?: string
	layerPool: LayerPool
	layers: string[]
	highlightTrigger?: HighlightTrigger
	highlightLayers?: string[]
	fitBoundsOptions?: boolean | mapboxgl.FitBoundsOptions
}
type DataMap = Map<any, { geometry: GeoJSON.Geometry; properties: any }>
const CURSOR_CLASS = 'mapbox-utils-layer-hover'
export default class CanHighlighLayer {
	protected _map: mapboxgl.Map | null
	private _key?: string
	protected _data: DataMap
	private _beforeId?: string
	private _isMouseOver: boolean
	private _layers: string[]
	private _highlightTrigger: HighlightTrigger
	private _highlightLayers: string[]
	private _highlightFeatureId: any
	private _lngLatBounds: mapboxgl.LngLatBoundsLike | null
	private _fitBoundsOptions: boolean | mapboxgl.FitBoundsOptions
	protected _sourceId: string
	protected _cluster: boolean
	protected _ev: Event | null
	protected _layerPool: LayerPool
	constructor(options: Options) {
		this._map = null
		this._ev = new Event()
		this._data = new Map()
		this._sourceId = ''
		this._layerPool = options.layerPool || {}
		this._beforeId = undefined
		this._lngLatBounds = null
		this._cluster = false
		this._fitBoundsOptions = options.fitBoundsOptions || false
		this._key = isNotNull(options.key) ? options.key : undefined
		this._layers = options.layers?.slice() || []
		this._highlightFeatureId = null
		this._highlightLayers = options.highlightLayers?.slice() || []
		this._highlightTrigger = options.highlightTrigger || 'none'
		this._isMouseOver = false
		bindAll(['_onClick', '_onMouseMove', '_onData', '_onMouseLeave', '_onStyleLoad'], this)
	}

	get sourceId() {
		return this._sourceId
	}

	get layerIds() {
		return this._layers.map((layer) => getLayerId(this.sourceId, layer))
	}

	get highlightLayerIds() {
		return this._highlightTrigger !== 'none'
			? this._highlightLayers.map((layer) => getHighlightLayerId(this.sourceId, layer))
			: []
	}

	get firstLayerId() {
		const fullLayers = this._getAllLayers()
		return fullLayers[0]
	}

	get lastLayerId() {
		const fullLayers = this._getAllLayers()
		return fullLayers[fullLayers.length - 1]
	}

	protected _getAllLayers() {
		return [...this.layerIds, ...this.highlightLayerIds]
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
		this._highlightFeatureId = null
		this._beforeId = undefined
		this._isMouseOver = false
		return this
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
		this._highlightFeatureId = null
		const source = this._map?.getSource(this.sourceId) as mapboxgl.GeoJSONSource | null
		source?.setData(getSourceData(this._data))
		this.removeHighlight()
		this._fitBounds()
		return this
	}

	setHighlight(val: any) {
		if (this._highlightTrigger === 'manual') {
			this._setHighlight(val)
		}
		return this
	}

	removeHighlight() {
		if (this._highlightTrigger !== 'none') {
			this._setHighlight(null)
		}
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

	on(type: any, fn: (e: any) => void) {
		this._ev?.on(type, fn)
	}

	getFeature(id: string) {
		return this._data.get(id)
	}

	private _setCursorClass(bool: boolean) {
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
		this._map[type]('mousemove', this._onMouseMove)
		if (type === 'on') {
			this._map.getContainer().addEventListener('mouseleave', this._onMouseLeave)
		} else {
			this._map.getContainer().removeEventListener('mouseleave', this._onMouseLeave)
		}
	}

	private _onStyleLoad() {
		this._addSourceAndLayers()
	}

	private _onClick(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (!feature) return
		if ([...this.layerIds, ...this.highlightLayerIds].includes(feature.layer.id)) {
			if (this._highlightTrigger === 'click') {
				this._setHighlight(feature.id)
			}
			// 触发点击事件
			const { geometry, properties } = this._data.get(feature.properties!.id)!
			this._ev?.fire('click', {
				originEvent: e,
				geometry: JSON.parse(JSON.stringify(geometry)),
				properties
			})
		} else {
			this._onExtraLayerClick(e, feature)
		}
	}

	protected _onExtraLayerClick(
		_e: mapboxgl.MapMouseEvent,
		_feature: mapboxgl.MapboxGeoJSONFeature
	) {
		// 如果需要除基础图层和高亮图层之外的其他图层，可以在此添加
	}

	private _onMouseMove(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (feature && [...this.layerIds, ...this.highlightLayerIds].includes(feature.layer.id)) {
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
			if (this._highlightTrigger === 'hover') {
				this._setHighlight(feature.id)
			}

			this._setCursorClass(true)
		} else if (this._isMouseOver) {
			this._ev?.fire('mouseleave')
			this._isMouseOver = false
			if (this._highlightTrigger === 'hover') {
				this._setHighlight(null)
			}
			this._setCursorClass(false)
		}
	}

	private _onMouseLeave() {
		if (this._isMouseOver) {
			this._isMouseOver = false
			this._ev?.fire('mouseleave')
		}
		if (this._highlightTrigger === 'hover') {
			this._setHighlight(null)
		}
		this._setCursorClass(false)
	}

	private _setHighlight(val: any) {
		if (!this._map || this._highlightFeatureId === val) return
		const map = this._map
		this._highlightFeatureId = val
		const highlightFilters = getHighlightFilters(true, this._highlightFeatureId)
		const clusterFilters = getClusterFilters(this._cluster)
		this._layers.forEach((layer) => {
			const filters = getLayerFilters(highlightFilters, clusterFilters)
			map.setFilter(
				getLayerId(this.sourceId, layer),
				combineFilters(filters, this._layerPool[layer].filter)
			)
		})
		this._highlightLayers.forEach((layer) => {
			const filters = getHighlightLayerFilters(highlightFilters, clusterFilters)
			map.setFilter(
				getHighlightLayerId(this.sourceId, layer),
				combineFilters(filters, this._layerPool[layer].filter)
			)
		})
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

	protected _getSourceOption(): mapboxgl.GeoJSONSourceRaw {
		return {
			data: getSourceData(this._data),
			type: 'geojson',
			promoteId: 'id'
		}
	}

	private _getLayers() {
		const fullLayers: Array<[string, LayerType, any[]]> = []
		const highlightFilters = getHighlightFilters(
			this._highlightTrigger !== 'none',
			this._highlightFeatureId
		)
		const clusterFilters = getClusterFilters(this._cluster)
		this._layers.forEach((layer) => {
			const filters = getLayerFilters(highlightFilters, clusterFilters)
			fullLayers.push([getLayerId(this.sourceId, layer), this._layerPool[layer], filters])
		})
		if (this._highlightTrigger !== 'none') {
			this._highlightLayers.forEach((layer) => {
				const filters = getHighlightLayerFilters(highlightFilters, clusterFilters)
				fullLayers.push([
					getHighlightLayerId(this.sourceId, layer),
					this._layerPool[layer],
					filters
				])
			})
		}
		fullLayers.push(...this.getExtraLayers())
		return fullLayers
	}

	protected getExtraLayers(): [string, LayerType, any[]][] {
		return []
	}

	private _fitBounds() {
		if (!this._map) return
		if (!this._fitBoundsOptions || !this._lngLatBounds) return
		const fitBoundsOptions = this._fitBoundsOptions === true ? undefined : this._fitBoundsOptions
		this._map?.fitBounds(this._lngLatBounds, fitBoundsOptions)
	}
}

function getLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}`
}
function getHighlightLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}-highlight`
}

function getLayerFilters(highlightFilters: any[], clusterFilters: any[]): any[] {
	return [
		...highlightFilters.map((item) => ['!', item]),
		...clusterFilters.map((item) => ['!', item])
	]
}
function getHighlightFilters(enableHighlight: boolean, value: any) {
	return enableHighlight ? (isNotNull(value) ? [['==', ['get', 'id'], value]] : [['!', true]]) : []
}

export function getClusterFilters(cluster: boolean): any[] {
	return cluster ? [['all', ['has', 'cluster_id'], ['==', ['get', 'cluster'], true]]] : []
}

function getHighlightLayerFilters(highlightFilters: any[], clusterFilters: any[]): any[] {
	return [...highlightFilters, ...clusterFilters.map((item) => ['!', item])]
}

function combineFilters(filters: any[], filter?: any[] | null) {
	isNotNull(filter) && filters.push(filter)
	return filters.length ? (filters.length > 1 ? ['all', ...filters] : filters[0]) : undefined
}

function queryRendererFeaturesBySource(map: mapboxgl.Map, source: string, point: mapboxgl.Point) {
	const features = map.queryRenderedFeatures(point)
	// TODO: 是否只获取所有图层的最上层
	return features.length && features[0].source === source ? features[0] : undefined
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

function getSourceData(data: DataMap) {
	const features: GeoJSON.Feature[] = []
	data.forEach(({ geometry }, id) => {
		features.push(feature(geometry, { id }))
	})
	return featureCollection(features)
}

function addLayer(
	map: mapboxgl.Map,
	sourceId: string,
	layerOption: LayerType & { id: string },
	filters: any[] = [],
	beforeId?: string
) {
	if (map.getLayer(layerOption.id)) return
	const filter = combineFilters(filters, layerOption.filter)
	const layerOptions: AnyLayer = {
		...layerOption,
		source: sourceId
	}
	filter && (layerOptions.filter = filter)
	map.addLayer(layerOptions, beforeId)
}
