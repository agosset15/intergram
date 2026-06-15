export const enabled = (() => {
    try {
        localStorage.setItem('__ig_test__', '1');
        localStorage.removeItem('__ig_test__');
        return true;
    } catch (e) {
        return false;
    }
})();

export function get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

export function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    return value;
}

export function transact(key, fn) {
    const val = get(key) || [];
    fn(val);
    set(key, val);
}
