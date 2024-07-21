import type mapboxgl from 'mapbox-gl'
import { getId } from '../../utils'
import { DisabledProperty } from '../GeoJSONLayer'
import HighlightableLayer, { Options as HighlightableLayerOptions } from '../HighlightableLayer'
type LayerOption =
	| Omit<mapboxgl.LineLayer, DisabledProperty>
	| Omit<mapboxgl.FillLayer, DisabledProperty>
type LayerPool = Record<string, LayerOption>
interface Options extends HighlightableLayerOptions {
	layerPool: LayerPool
}
export default class PolygonLayer extends HighlightableLayer {
	constructor(options: Options) {
		super(options)
		this._sourceId = getId('polygon')
	}

	protected _getLayerFilters(highlightFilters: any[]) {
		return [...highlightFilters.map((item) => ['!', item]), ['==', ['geometry-type'], 'Polygon']]
	}

	protected _getHighlightLayerFilters(highlightFilters: any[]) {
		return [...highlightFilters, ['==', ['geometry-type'], 'Polygon']]
	}
}
