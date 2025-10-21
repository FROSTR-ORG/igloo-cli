// Global runtime patch for nostr-tools SimplePool.subscribeMany
// Some relays reject a single-element array for filters (expecting an object).
// Normalize `[[filter]]` to `filter` to avoid "provided filter is not an object" errors.
// Idempotent and safe to import multiple times.
import {SimplePool} from 'nostr-tools';

try {
  const proto = (SimplePool as any)?.prototype;
  if (proto && !proto.__iglooFilterNormalizePatched) {
    const original = proto.subscribeMany;
    if (typeof original === 'function') {
      proto.subscribeMany = function patchedSubscribeMany(this: unknown, relays: unknown, filters: unknown, params: unknown) {
        const normalized = Array.isArray(filters) && filters.length === 1 && filters[0] &&
          typeof filters[0] === 'object' && !Array.isArray(filters[0])
          ? filters[0]
          : filters;
        return original.call(this, relays, normalized, params);
      };
      Object.defineProperty(proto, '__iglooFilterNormalizePatched', {value: true});
    }
  }
} catch {
  // Best-effort only; if nostr-tools changes, we fail silently.
}

