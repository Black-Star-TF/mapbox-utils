import type mapboxgl from 'mapbox-gl'
import { isNotNull, getId } from '../../utils'
import HighlightableLayer, { Options as HighlightableLayerOptions } from '../HighlightableLayer'
import { DisabledProperty, EventType, Events as GeoJSONLayerEvents } from '../GeoJSONLayer'
type LayerOption =
	| Omit<mapboxgl.CircleLayer, DisabledProperty>
	| Omit<mapboxgl.SymbolLayer, DisabledProperty>
	| Omit<mapboxgl.LineLayer, DisabledProperty>
	| Omit<mapboxgl.FillLayer, DisabledProperty>
type LayerPool = Record<string, LayerOption>
type PointLayerEventType = EventType | 'cluster-click'
interface Events extends GeoJSONLayerEvents {
	'cluster-click': {
		cluster: Array<{ geometry: GeoJSON.Geometry; properties: any }>
		originMapEvent: mapboxgl.MapMouseEvent
	}
}
interface Options extends HighlightableLayerOptions {
	layerPool: LayerPool
	cluster?: boolean
	clusterLayers?: string[]
	clusterMaxZoom?: number
	clusterMinPoints?: number
	clusterProperties?: any
	clusterRadius?: number
}
export default class PointLayer extends HighlightableLayer {
	private _clusterLayers: string[]
	private _clusterMaxZoom?: number
	private _clusterMinPoints?: number
	private _clusterProperties?: any
	private _clusterRadius?: number
	protected _cluster: boolean
	protected declare _layerPool: LayerPool
	constructor(options: Options) {
		super(options)
		this._layerPool = options.layerPool || {}
		this._cluster = options.cluster || false
		this._clusterLayers = options.clusterLayers?.slice() || []
		this._clusterRadius = options.clusterRadius
		this._clusterMaxZoom = options.clusterMaxZoom
		this._clusterMinPoints = options.clusterMinPoints
		this._clusterProperties = {
			...options.clusterProperties
		}
		this._sourceId = getId('point')
	}

	get clusterLayerIds() {
		return this._cluster
			? this._clusterLayers.map((layer) => getClusterLayerId(this.sourceId, layer))
			: []
	}

	on<T extends PointLayerEventType>(type: T, fn: (e: Events[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}

	protected _getAllLayers() {
		return [...this.layerIds, ...this.highlightLayerIds, ...this.clusterLayerIds]
	}

	protected _getSourceOption() {
		const sourceOption = super._getSourceOption()
		isNotNull(this._cluster) && (sourceOption.cluster = this._cluster)
		isNotNull(this._clusterMaxZoom) && (sourceOption.clusterMaxZoom = this._clusterMaxZoom)
		isNotNull(this._clusterMinPoints) && (sourceOption.clusterMinPoints = this._clusterMinPoints)
		isNotNull(this._clusterProperties) && (sourceOption.clusterProperties = this._clusterProperties)
		isNotNull(this._clusterRadius) && (sourceOption.clusterRadius = this._clusterRadius)
		return sourceOption
	}

	protected _onExtraLayerClick(e: mapboxgl.MapMouseEvent, feature: mapboxgl.MapboxGeoJSONFeature) {
		if (this.clusterLayerIds.includes(feature.layer.id)) {
			// 聚合点点击事件
			const source = this._map!.getSource(this._sourceId) as mapboxgl.GeoJSONSource
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

	protected getExtraLayers(): [string, LayerOption, any[]][] {
		return this._cluster
			? this._clusterLayers.map((layer) => {
					return [
						getClusterLayerId(this.sourceId, layer),
						this._layerPool[layer],
						getClusterFilters(true)
					]
				})
			: []
	}

	protected _getLayerFilters(highlightFilters: any[]) {
		return [
			...highlightFilters.map((item) => ['!', item]),
			...getClusterFilters(this._cluster).map((item) => ['!', item]),
			['==', ['geometry-type'], 'Point']
		]
	}

	protected _getHighlightLayerFilters(highlightFilters: any[]) {
		return [
			...highlightFilters,
			...getClusterFilters(this._cluster).map((item) => ['!', item]),
			['==', ['geometry-type'], 'Point']
		]
	}
}

function getClusterLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}-cluster`
}

function getClusterFilters(cluster: boolean): any[] {
	return cluster ? [['all', ['has', 'cluster_id'], ['==', ['get', 'cluster'], true]]] : []
}
