import { customAlphabet } from 'nanoid'

export const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export function getId(type: string) {
	return `mapbox-utils-${type}-${nanoid()}`
}

export function getLayerId(sourceId: string, layerId: string) {
	return `${sourceId}-${layerId}`
}

export function queryRendererFeaturesBySource(
	map: mapboxgl.Map,
	source: string,
	point: mapboxgl.Point
) {
	const features = map.queryRenderedFeatures(point)
	// TODO: 是否只获取所有图层的最上层
	return features.length && features[0].source === source ? features[0] : undefined
}

export function combineFilters(filters: any[], filter?: any[] | null) {
	isNotNull(filter) && filters.push(filter)
	return filters.length ? (filters.length > 1 ? ['all', ...filters] : filters[0]) : undefined
}

export function bindAll(fns: Array<string>, context: any): void {
	fns.forEach((fn) => {
		if (!context[fn]) {
			return
		}
		context[fn] = context[fn].bind(context)
	})
}

export function extend(
	dest: Record<any, any>,
	...sources: Array<Record<any, any>>
): Record<any, any> {
	for (const src of sources) {
		for (const k in src) {
			dest[k] = src[k]
		}
	}
	return dest
}

export function isUndefined(value: any) {
	return typeof value === 'undefined'
}

export function isRealNull(value: any) {
	return value === null
}

export function isNull(value: any) {
	return isUndefined(value) || isRealNull(value)
}

export function isNotNull(value: any) {
	return !isUndefined(value) && !isRealNull(value)
}

export function setCursorClass(
	map: mapboxgl.Map | undefined | null,
	cursorClass: string,
	bool: boolean
) {
	if (!map) return
	const hasCursorClass = map.getContainer().classList.contains(cursorClass)
	if (bool && !hasCursorClass) {
		map.getContainer().classList.add(cursorClass)
	} else if (!bool && hasCursorClass) {
		map.getContainer().classList.remove(cursorClass)
	}
}
