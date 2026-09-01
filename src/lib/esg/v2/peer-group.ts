/**
 * Règles de comparaison — le garde-fou structurel contre le titre de presse.
 *
 * Aucun tri global du catalogue par score n'est possible. Les comparaisons
 * n'existent qu'à l'intérieur d'un groupe de pairs, défini par
 * `(classe d'actifs, zone géographique, thématique déclarée)`.
 *
 * Ce n'est pas une préférence d'affichage : c'est ce qui empêche, par
 * construction, de produire « Seedow note le nucléaire mieux que le solaire ».
 * Le nucléaire et le solaire ne sont plus dans le même tableau — non parce que
 * la comparaison serait gênante, mais parce qu'elle n'a pas de sens : un STI
 * mesure ce qu'un fonds publie, et deux fonds de catégories différentes ne sont
 * pas soumis aux mêmes obligations de publication.
 *
 * `assertComparable` échoue bruyamment plutôt que de laisser passer un
 * classement inter-catégories : une règle qui n'est qu'écrite dans une doc finit
 * toujours par être contournée par une nouvelle surface d'affichage.
 */

export interface PeerGroupInput {
  assetClass: string;
  /** Zone géographique déclarée (« europe », « monde », « em »…). */
  region: string | null;
  /** Thématique DÉCLARÉE par le fonds (cf. `theme-claims.ts`), jamais attribuée. */
  declaredTheme: string | null;
}

export interface PeerGroup {
  key: string;
  assetClass: string;
  region: string;
  declaredTheme: string;
}

const UNSPECIFIED = "non_precise";

function norm(value: string | null | undefined): string {
  const v = (value ?? "").trim().toLowerCase();
  return v || UNSPECIFIED;
}

export function peerGroup(input: PeerGroupInput): PeerGroup {
  const assetClass = norm(input.assetClass);
  const region = norm(input.region);
  const declaredTheme = norm(input.declaredTheme);
  return { key: `${assetClass}|${region}|${declaredTheme}`, assetClass, region, declaredTheme };
}

export function peerGroupKey(input: PeerGroupInput): string {
  return peerGroup(input).key;
}

/** Deux fonds sont comparables si et seulement si leur groupe de pairs est identique. */
export function canCompare(a: PeerGroupInput, b: PeerGroupInput): boolean {
  return peerGroupKey(a) === peerGroupKey(b);
}

/**
 * Regroupe une liste par groupe de pairs. Le tri à l'intérieur d'un groupe est
 * laissé à l'appelant — mais il ne peut trier QUE là.
 */
export function groupByPeers<T>(items: readonly T[], keyOf: (item: T) => PeerGroupInput) {
  const groups = new Map<string, { group: PeerGroup; items: T[] }>();
  for (const item of items) {
    const group = peerGroup(keyOf(item));
    const bucket = groups.get(group.key);
    if (bucket) bucket.items.push(item);
    else groups.set(group.key, { group, items: [item] });
  }
  return [...groups.values()];
}

/**
 * Refuse un classement inter-catégories. Appelée par toute surface qui trie une
 * liste de fonds par STI : si la liste franchit une frontière de groupe, le tri
 * n'est pas autorisé.
 */
export function assertComparable(inputs: readonly PeerGroupInput[]): void {
  if (inputs.length < 2) return;
  const first = peerGroupKey(inputs[0]);
  const stray = inputs.find((i) => peerGroupKey(i) !== first);
  if (stray) {
    throw new Error(
      `Classement inter-catégories refusé : « ${first} » et « ${peerGroupKey(stray)} » ne sont pas des pairs. Un STI ne se classe qu'à l'intérieur d'un groupe (classe d'actifs, zone, thématique déclarée).`,
    );
  }
}
