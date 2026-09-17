package {{mainPackage}}.items;

import java.time.Instant;

/**
 * Worked example domain type — replace with your real model, or delete this
 * whole package once you've wired up something real.
 */
public record Item(String id, String name, Instant createdAt) {
}
