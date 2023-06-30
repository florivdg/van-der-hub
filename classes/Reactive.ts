export default class Reactive<T> {
  private _value: T
  private subscribers: ((value: T) => void)[] = []

  constructor(initialValue: T) {
    this._value = initialValue
  }

  get value(): T {
    return this._value
  }

  set value(newValue: T) {
    this._value = newValue
    this.notifySubscribers()
  }

  subscribe(callback: (value: T) => void) {
    this.subscribers.push(callback)
  }

  private notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber(this._value)
    }
  }
}
