package {{mainPackage}}.items;

import jakarta.validation.constraints.NotBlank;

public record CreateItemRequest(@NotBlank String name) {
}
