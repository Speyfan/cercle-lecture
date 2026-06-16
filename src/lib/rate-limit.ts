import { LRUCache } from "lru-cache";

// Limiteur en mémoire (suffisant pour une app mono-conteneur < 50 utilisateurs).
// Réinitialisé au redémarrage du serveur — acceptable pour ce volume.

const loginAttempts = new LRUCache<string, number>({
  max: 5000,
  ttl: 15 * 60 * 1000, // fenêtre glissante de 15 min
});

const MAX_LOGIN_ATTEMPTS = 8;

/** True si la clé a dépassé le quota de tentatives de connexion échouées. */
export function isLoginBlocked(key: string): boolean {
  return (loginAttempts.get(key) ?? 0) >= MAX_LOGIN_ATTEMPTS;
}

export function recordLoginFailure(key: string): void {
  loginAttempts.set(key, (loginAttempts.get(key) ?? 0) + 1);
}

export function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}
