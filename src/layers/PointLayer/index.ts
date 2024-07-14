import { bboxPolygon, bbox, featureCollection, feature } from '@turf/turf'
import type mapboxgl from 'mapbox-gl'
import { bindAll, getId, isNotNull, nanoid } from '../../utils'
import Event from '../../utils/Event'
const CURSOR_CLASS = 'mapbox-utils-point-layer'
type Geometry = GeoJSON.Point | GeoJSON.MultiPoint | GeoJSON.LineString | GeoJSON.MultiLineString
type Data = GeoJSON.FeatureCollection<Geometry> | GeoJSON.Feature<Geometry> | null
type OmitProperty = 'source' | 'source-layer' | 'id'
type LayerType = Omit<mapboxgl.CircleLayer, OmitProperty> | Omit<mapboxgl.SymbolLayer, OmitProperty>
type LayerPool = {
	[k: string]: LayerType
}
const highlightTriggers = ['none', 'click', 'hover', 'manual'] as const
type HighlightTrigger = (typeof highlightTriggers)[number]
type Options = {
	key?: string
	layerPool?: LayerPool
	layers?: string[]
	highlightTrigger?: HighlightTrigger
	highlightLayers?: string[]
	cluster?: boolean
	clusterLayers?: string[]
	clusterMaxZoom?: number
	clusterMinPoints?: number
	clusterProperties?: any
	clusterRadius?: number
	fitBoundsOptions?: boolean | mapboxgl.FitBoundsOptions
}

type EventType = 'click' | 'mousemove' | 'mouseenter' | 'mouseleave' | 'cluster-click'

type EventData = {
	click: {
		geometry: GeoJSON.Geometry
		properties: any
		originMapEvent: mapboxgl.MapMouseEvent
	}
	mousemove: {
		geometry: GeoJSON.Geometry
		properties: any
		originMapEvent: mapboxgl.MapMouseEvent
	}
	mouseenter: {
		geometry: GeoJSON.Geometry
		properties: any
		originMapEvent: mapboxgl.MapMouseEvent
	}
	mouseleave: {
		originMapEvent?: mapboxgl.MapMouseEvent
	}
	'cluster-click': {
		cluster: Array<{ geometry: GeoJSON.Geometry; properties: any }>
		originMapEvent: mapboxgl.MapMouseEvent
	}
}
// type Event<T extends EventType> = EventData[T] & { type: T }

type DataMap = Map<any, { geometry: GeoJSON.Geometry; properties: any }>
export default class PointLayer {
	private _sourceId: string
	private _beforeId?: string
	private _map: mapboxgl.Map | null
	protected _highlightFeatureId: any
	private _lngLatBounds: mapboxgl.LngLatBoundsLike | null
	private _key?: string
	private _data: DataMap
	private _layerPool: LayerPool
	private _layers: string[]
	private _highlightTrigger: HighlightTrigger
	private _highlightLayers: string[]
	private _cluster: boolean
	private _clusterLayers: string[]
	private _clusterMaxZoom?: number
	private _clusterMinPoints?: number
	private _clusterProperties?: any
	private _clusterRadius?: number
	private _isMouseOver: boolean
	private _fitBoundsOptions: boolean | mapboxgl.FitBoundsOptions
	private _ev: Event | null
	constructor(options: Options) {
		this._ev = new Event()
		this._map = null
		this._beforeId = undefined
		this._key = isNotNull(options.key) ? options.key : undefined
		this._sourceId = getId('point')
		this._data = new Map()
		this._layerPool = options.layerPool || {}
		this._layers = options.layers?.slice() || []
		this._cluster = options.cluster || false
		this._clusterLayers = options.clusterLayers?.slice() || []
		this._clusterRadius = options.clusterRadius
		this._clusterMaxZoom = options.clusterMaxZoom
		this._clusterMinPoints = options.clusterMinPoints
		this._clusterProperties = {
			...options.clusterProperties
		}
		this._highlightLayers = options.highlightLayers?.slice() || []
		this._highlightTrigger = options.highlightTrigger || 'none'
		this._highlightFeatureId = null
		this._lngLatBounds = null
		this._fitBoundsOptions = options.fitBoundsOptions || false
		this._isMouseOver = false
		bindAll(['_onClick', '_onMouseMove', '_onData', '_onMouseLeave'], this)
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

	get clusterLayerIds() {
		return this._cluster
			? this._clusterLayers.map((layer) => gteClusterLayerId(this.sourceId, layer))
			: []
	}

	get firstLayerId() {
		const fullLayers = [...this.layerIds, ...this.highlightLayerIds, ...this.clusterLayerIds]
		return fullLayers[0]
	}

	get lastLayerId() {
		const fullLayers = [...this.layerIds, ...this.highlightLayerIds, ...this.clusterLayerIds]
		return fullLayers[fullLayers.length - 1]
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

	setData(data?: Data) {
		if (data) {
			try {
				const bounds = bboxPolygon(bbox(data)).bbox!
				this._lngLatBounds = bounds.includes(Infinity)
					? null
					: (bounds as mapboxgl.LngLatBoundsLike)

				this._data.clear()
				if (data.type === 'FeatureCollection') {
					data.features.forEach((item) => {
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

	on<T extends EventType>(type: EventType, fn: (e: EventData[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}

	getFeature(id: string) {
		return this._data.get(id)
	}

	private _handleEventListener(type: 'on' | 'off') {
		if (!this._map) return
		this._map[type]('click', this._onClick)
		this._map[type]('mousemove', this._onMouseMove)
		if (type === 'on') {
			this._map.getContainer().addEventListener('mouseleave', this._onMouseLeave)
		} else {
			this._map.getContainer().removeEventListener('mouseleave', this._onMouseLeave)
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
		} else if (this.clusterLayerIds.includes(feature.layer.id)) {
			// 聚合点点击事件
			const source = this._map.getSource(this._sourceId) as mapboxgl.GeoJSONSource
			source.getClusterLeaves(
				feature.properties?.cluster_id,
				feature.properties?.point_count,
				0,
				(error, features) => {
					if (error) return
					this._ev?.fire('cluster-click', {
						originEvent: e,
						cluster: features.map((feature) => {
							const { geometry, properties } = this._data.get(feature.properties!.id)!
							return { geometry: JSON.parse(JSON.stringify(geometry)), properties }
						})
					})
				}
			)
		}
	}

	private _onMouseMove(e: mapboxgl.MapMouseEvent) {
		if (!this._map) return
		const map = this._map
		const feature = queryRendererFeaturesBySource(map, this._sourceId, e.point)
		if (feature && this.layerIds.includes(feature.layer.id)) {
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

	private _setCursorClass(bool: boolean) {
		if (!this._map) return
		const hasCursorClass = this._map.getContainer().classList.contains(CURSOR_CLASS)
		if (bool && !hasCursorClass) {
			this._map.getContainer().classList.add(CURSOR_CLASS)
		} else if (!bool && hasCursorClass) {
			this._map.getContainer().classList.remove(CURSOR_CLASS)
		}
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

	private _fitBounds() {
		if (!this._map) return
		if (!this._fitBoundsOptions || !this._lngLatBounds) return
		const fitBoundsOptions = this._fitBoundsOptions === true ? undefined : this._fitBoundsOptions
		this._map?.fitBounds(this._lngLatBounds, fitBoundsOptions)
	}

	private _addSourceAndLayers() {
		if (!this._map) return
		const map = this._map
		const sourceOption: mapboxgl.GeoJSONSourceRaw = {
			data: getSourceData(this._data),
			type: 'geojson',
			promoteId: 'id'
		}
		isNotNull(this._cluster) && (sourceOption.cluster = this._cluster)
		isNotNull(this._clusterMaxZoom) && (sourceOption.clusterMaxZoom = this._clusterMaxZoom)
		isNotNull(this._clusterMinPoints) && (sourceOption.clusterMinPoints = this._clusterMinPoints)
		isNotNull(this._clusterProperties) && (sourceOption.clusterProperties = this._clusterProperties)
		isNotNull(this._clusterRadius) && (sourceOption.clusterRadius = this._clusterRadius)
		map.addSource(this.sourceId, sourceOption)

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

		if (this._cluster) {
			this._clusterLayers.forEach((layer) => {
				fullLayers.push([
					gteClusterLayerId(this.sourceId, layer),
					this._layerPool[layer],
					clusterFilters
				])
			})
		}

		fullLayers.forEach(([id, layerOption, filters]) => {
			addLayer(map, this.sourceId, { ...layerOption, id }, filters, this._beforeId)
		})
	}

	private _removeSourceAndLayers() {
		if (!this._map) return
		const map = this._map
		this.layerIds.forEach((layerId) => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId)
			}
		})

		this.highlightLayerIds.forEach((layerId) => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId)
			}
		})

		this.clusterLayerIds.forEach((layerId) => {
			if (map.getLayer(layerId)) {
				map.removeLayer(layerId)
			}
		})

		if (map.getSource(this.sourceId)) {
			map.removeSource(this.sourceId)
		}
	}
}

function getLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}`
}
function getHighlightLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}-highlight`
}
function gteClusterLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}-cluster`
}

function getHighlightFilters(enableHighlight: boolean, value: any) {
	return enableHighlight ? (isNotNull(value) ? [['==', ['get', 'id'], value]] : [['!', true]]) : []
}

function getClusterFilters(cluster: boolean): any[] {
	return cluster ? [['all', ['has', 'cluster_id'], ['==', ['get', 'cluster'], true]]] : []
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
	const layerOptions: mapboxgl.AnyLayer = {
		...layerOption,
		source: sourceId
	}
	filter && (layerOptions.filter = filter)
	map.addLayer(layerOptions, beforeId)
}

function combineFilters(filters: any[], filter?: any[] | null) {
	isNotNull(filter) && filters.push(filter)
	return filters.length ? (filters.length > 1 ? ['all', ...filters] : filters[0]) : undefined
}

function getLayerFilters(highlightFilters: any[], clusterFilters: any[]): any[] {
	return [
		...highlightFilters.map((item) => ['!', item]),
		...clusterFilters.map((item) => ['!', item])
	]
}

function getHighlightLayerFilters(highlightFilters: any[], clusterFilters: any[]): any[] {
	return [...highlightFilters, ...clusterFilters.map((item) => ['!', item])]
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
