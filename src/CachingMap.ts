const CLEAN_INTERVAL = 30;

class CachedEntry<V> {
  parent: CachingMap<any, V>;
  value: V;
  lastAccess: number;

  constructor(parent: CachingMap<any, V>, value: V) {
    this.parent = parent;
    this.value = value;
    this.lastAccess = Date.now();
  }

  check(): boolean {
    const expiry = this.lastAccess + this.parent.expireMillis;
    return Date.now() < expiry;
  }

  checkAndTouch(): boolean {
    const currentTime = Date.now();
    const expiry = this.lastAccess + this.parent.expireMillis;
    const expired = currentTime >= expiry;
    this.lastAccess = currentTime;
    return !expired;
  }
}

export default class CachingMap<K, V> {
  delegate: Map<string, CachedEntry<V>>;
  expireMillis: number;
  cleanerTick: number;

  constructor(expireMillis: number) {
    this.delegate = new Map();
    this.expireMillis = expireMillis;
    this.cleanerTick = CLEAN_INTERVAL;
  }

  clean() {
    this.delegate.forEach((value, key, map) => {
      if (!value.check()) {
        map.delete(key);
      }
    });
  }

  async get(key: K, loader: (key: K) => Promise<V | undefined>): Promise<V | undefined> {
    if (this.cleanerTick-- <= 0) {
      this.cleanerTick = CLEAN_INTERVAL;
      this.clean();
    }

    // thanks js, I hate it
    const keyStr = JSON.stringify(key);

    let entry = this.delegate.get(keyStr);
    if (entry?.checkAndTouch()) {
      return entry.value; // still valid
    }

    // refresh cache entry
    this.delegate.delete(keyStr);

    const value = await loader(key);
    if (!value) {
      return undefined;
    }

    if (!entry) {
      entry = new CachedEntry(this, value);
      this.delegate.set(keyStr, entry);
    } else {
      entry.value = value;
    }
    return value;
  }
}
