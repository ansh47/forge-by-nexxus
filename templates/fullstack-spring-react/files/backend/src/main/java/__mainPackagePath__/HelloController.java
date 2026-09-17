package {{mainPackage}};

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Sanity-check endpoint so the frontend has something real to call on first run.
 * Delete once you've wired up your actual API.
 */
@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public Map<String, Object> hello() {
        return Map.of(
            "message", "Hello from {{projectNameHuman}}!",
            "timestamp", Instant.now().toString()
        );
    }
}
