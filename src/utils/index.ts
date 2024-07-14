import { customAlphabet } from 'nanoid'

export const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export function getId(type: string) {
	return `mapbox-utils-${type}-${nanoid()}`
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
