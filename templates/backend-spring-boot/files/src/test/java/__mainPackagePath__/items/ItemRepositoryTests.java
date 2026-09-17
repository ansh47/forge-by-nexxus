package {{mainPackage}}.items;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ItemRepositoryTests {

    @Test
    void savedItemsCanBeFoundAndDeleted() {
        ItemRepository repo = new ItemRepository();

        Item saved = repo.save("test item");
        assertThat(repo.findById(saved.id())).contains(saved);

        repo.deleteById(saved.id());
        assertThat(repo.findById(saved.id())).isEmpty();
    }
}
