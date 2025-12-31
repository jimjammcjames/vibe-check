# Implement Distributed Caching Layer

We need a robust caching system for our API service. The requirements are strict and multi-layered.

## Functional Requirements

1.  **Interface**: Create a `CacheService` interface with `get`, `set`, and `invalidate` methods.
2.  **Implementation**: Implement a `RedisCacheService` that uses `ioredis`.
3.  **Fallback**: Implement a `MemoryCacheFallback` that is used if Redis is unavailable.
4.  **Resilience**: Use a circuit breaker pattern (you can implement a simple one) to switch to memory cache after 3 consecutive Redis failures.
5.  **Metrics**: Instrument the service to log cache hits, misses, and circuit breaker state changes.

## Technical Constraints

- The `get` method must be generic and handle serialization/deserialization.
- You must use environment variables for Redis configuration (`REDIS_URL`).
- Code must be fully typed (TypeScript).

## Harness Compliance

- This is a critical infrastructure component.
- You must document your architectural decisions carefully.
- Test changes must cover both the Redis and Fallback paths.
