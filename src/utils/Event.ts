type Listener = (e: any) => any
type Listeners = {
	[_: string]: Array<Listener>
}
export default class Event {
	private _listeners: Listeners
	private _oneTimeListeners: Listeners

	constructor() {
		this._listeners = {}
		this._oneTimeListeners = {}
	}

	/**
	 * Adds a listener to a specified event type.
	 *
	 * @param {string} type The event type to add a listen for.
	 * @param {Function} listener The function to be called when the event is fired.
	 *   The listener function is called with the data object passed to `fire`,
	 *   extended with `target` and `type` properties.
	 * @returns {Object} `this`
	 */
	on(type: string, listener: Listener): this {
		addEventListener(type, listener, this._listeners)
		return this
	}

	/**
	 * Removes a previously registered event listener.
	 *
	 * @param {string} type The event type to remove listeners for.
	 * @param {Function} listener The listener function to remove.
	 * @returns {Object} `this`
	 */
	off(type: string, listener: Listener): this {
		removeEventListener(type, listener, this._listeners)
		removeEventListener(type, listener, this._oneTimeListeners)
		return this
	}

	/**
	 * Adds a listener that will be called only once to a specified event type.
	 *
	 * The listener will be called first time the event fires after the listener is registered.
	 *
	 * @param {string} type The event type to listen for.
	 * @param {Function} listener The function to be called when the event is fired the first time.
	 * @returns {Object} `this`
	 */
	once(type: string, listener: Listener): this {
		addEventListener(type, listener, this._oneTimeListeners)
		return this
	}

	fire(type: string, properties: any = {}) {
		if (this._listeners[type]) {
			// make sure adding or removing listeners inside other listeners won't cause an infinite loop
			const listeners = this._listeners[type]?.slice() || []
			for (const listener of listeners) {
				listener.call(this, { type, ...properties })
			}
		}

		if (this._oneTimeListeners[type]) {
			const listeners = this._oneTimeListeners[type]?.slice() || []
			for (const listener of listeners) {
				removeEventListener(type, listener, this._oneTimeListeners)
				listener.call(this, { type, ...properties })
			}
		}
	}
}

function removeEventListener(type: string, listener: Listener, listenerList: Listeners) {
	if (listenerList && listenerList[type]) {
		const index = listenerList[type].indexOf(listener)
		if (index !== -1) {
			listenerList[type].splice(index, 1)
		}
	}
}

function addEventListener(type: string, listener: Listener, listenerList: Listeners) {
	const listenerExist = listenerList[type] && listenerList[type].indexOf(listener) !== -1
	if (!listenerExist) {
		listenerList[type] = listenerList[type] || []
		listenerList[type].push(listener)
	}
}
