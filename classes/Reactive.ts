/**
 * A reactive class that allows subscribers to be notified when the value changes.
 * @template T The type of the reactive value.
 */
export default class Reactive<T> {
  /**
   * The current value of the reactive object.
   * @private
   */
  private _value: T

  /**
   * An array of subscriber callbacks.
   * @private
   */
  private subscribers: ((value: T) => void)[] = []

  /**
   * Creates a new Reactive object with the specified initial value.
   * @param initialValue The initial value of the reactive object.
   */
  constructor(initialValue: T) {
    this._value = initialValue
  }

  /**
   * Gets the current value of the reactive object.
   * @returns The current value of the reactive object.
   */
  get value(): T {
    return this._value
  }

  /**
   * Sets the current value of the reactive object and notifies all subscribers of the new value.
   * @param newValue The new value of the reactive object.
   */
  set value(newValue: T) {
    this._value = newValue
    this.notifySubscribers()
  }

  /**
   * Adds a new subscriber to the reactive object.
   * @param callback The callback function to be called when the value changes.
   * @returns A function that removes the subscriber from the reactive object.
   */
  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index !== -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  /**
   * Notifies all subscribers of the new value of the reactive object.
   * @private
   */
  private notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber(this._value)
    }
  }
}
