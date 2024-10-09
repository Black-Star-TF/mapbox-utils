import mapboxgl from 'mapbox-gl'
import {
	isNotNull,
	getId,
	getLayerId,
	setCursorClass,
	combineFilters,
	queryRendererFeaturesBySource
} from '../../utils'
import GeoJSONLayer, { Options as GeoJSONLayerOptions, DisabledProperty } from '../GeoJSONLayer'
import { CURSORS } from '../../utils/constants'
const highlightTriggers = ['none', 'click', 'hover', 'manual'] as const
type HighlightTrigger = (typeof highlightTriggers)[number]
type LayerOption =
	| Omit<mapboxgl.CircleLayer, DisabledProperty>
	| Omit<mapboxgl.SymbolLayer, DisabledProperty>
	| Omit<mapboxgl.LineLayer, DisabledProperty>
	| Omit<mapboxgl.FillLayer, DisabledProperty>
	| Omit<mapboxgl.FillExtrusionLayer, DisabledProperty>
type LayerPool = Record<string, LayerOption>
export interface Options extends GeoJSONLayerOptions {
	layerPool: LayerPool
	highlightTrigger?: HighlightTrigger
	highlightLayers?: string[]
}
export default class HighlightableLayer extends GeoJSONLayer {
	private _highlightTrigger: HighlightTrigger
	private _highlightLayers: string[]
	private _highlightFeatureId: any
	protected declare _layerPool: LayerPool
	constructor(options: Options) {
		super(options)
		this._layerPool = options.layerPool || {}
		this._sourceId = getId('highlightable')
		this._highlightFeatureId = null
		this._highlightLayers = options.highlightLayers?.slice() || []
		this._highlightTrigger = options.highlightTrigger || 'none'
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

	remove() {
		super.remove()
		this._highlightFeatureId = null
		return this
	}

	setData(data?: GeoJSON.Feature | GeoJSON.FeatureCollection) {
		super.setData(data)
		this._highlightFeatureId = null
		this.removeHighlight()
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

	protected _onClick(e: mapboxgl.MapMouseEvent) {
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

	protected _onMouseMove(e: mapboxgl.MapMouseEvent) {
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
			setCursorClass(this._map, CURSORS.POINTER, true)
		} else if (this._isMouseOver) {
			this._ev?.fire('mouseleave')
			this._isMouseOver = false
			if (this._highlightTrigger === 'hover') {
				this._setHighlight(null)
			}
			setCursorClass(this._map, CURSORS.POINTER, false)
		}
	}

	protected _onMouseLeave() {
		if (this._isMouseOver) {
			this._isMouseOver = false
			this._ev?.fire('mouseleave')
		}
		if (this._highlightTrigger === 'hover') {
			this._setHighlight(null)
		}
		setCursorClass(this._map, CURSORS.POINTER, false)
	}

	private _setHighlight(val: any) {
		if (!this._map || this._highlightFeatureId === val) return
		const map = this._map
		this._highlightFeatureId = val
		const highlightFilters = getHighlightFilters(true, this._highlightFeatureId)
		this._layers.forEach((layer) => {
			const filters = this._getLayerFilters(highlightFilters)
			map.setFilter(
				getLayerId(this.sourceId, layer),
				combineFilters(filters, this._layerPool[layer].filter)
			)
		})
		this._highlightLayers.forEach((layer) => {
			const filters = this._getHighlightLayerFilters(highlightFilters)
			map.setFilter(
				getHighlightLayerId(this.sourceId, layer),
				combineFilters(filters, this._layerPool[layer].filter)
			)
		})
	}

	protected _getLayerFilters(highlightFilters: any[]) {
		return [...highlightFilters.map((item) => ['!', item])]
	}

	protected _getHighlightLayerFilters(highlightFilters: any[]) {
		return [...highlightFilters]
	}

	protected _getLayers() {
		const fullLayers: Array<[string, LayerOption, any[]]> = []
		const highlightFilters = getHighlightFilters(
			this._highlightTrigger !== 'none',
			this._highlightFeatureId
		)
		this._layers.forEach((layer) => {
			const filters = this._getLayerFilters(highlightFilters)
			fullLayers.push([getLayerId(this.sourceId, layer), this._layerPool[layer], filters])
		})
		if (this._highlightTrigger !== 'none') {
			this._highlightLayers.forEach((layer) => {
				const filters = this._getHighlightLayerFilters(highlightFilters)
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

	protected getExtraLayers(): [string, LayerOption, any[]][] {
		return []
	}
}

function getHighlightLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}-highlight`
}

function getHighlightFilters(enableHighlight: boolean, value: any) {
	return enableHighlight ? (isNotNull(value) ? [['==', ['get', 'id'], value]] : [['!', true]]) : []
}
