const STORAGE_KEY = "ache-ofertas-br:favoritos";
const EVENT_NAME = "favoritos-alterados";

export function getFavoritosSnapshot() {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

export function subscribeFavoritos(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function salvarFavoritos(ids: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT_NAME));
}