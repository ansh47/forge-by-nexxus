package {{mainPackage}}.items;

import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store so the API works out of the box. Swap for a Spring Data
 * repository (JPA, JDBC, whatever) once you've picked a real database —
 * the controller only depends on this interface's shape.
 */
@Repository
public class ItemRepository {

    private final Map<String, Item> items = new ConcurrentHashMap<>();

    public Item save(String name) {
        Item item = new Item(UUID.randomUUID().toString(), name, java.time.Instant.now());
        items.put(item.id(), item);
        return item;
    }

    public Collection<Item> findAll() {
        return items.values();
    }

    public Optional<Item> findById(String id) {
        return Optional.ofNullable(items.get(id));
    }

    public void deleteById(String id) {
        items.remove(id);
    }
}
