package {{mainPackage}}.items;

public class ItemNotFoundException extends RuntimeException {
    public ItemNotFoundException(String id) {
        super("No item with id " + id);
    }
}
