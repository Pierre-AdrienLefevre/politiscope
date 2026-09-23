"""Calcul des positions à partir des indicateurs de la grille.

Voir `data/grille.md` pour le barème. Une position n'est calculée que si
l'entité porte assez d'indicateurs notés ; sinon elle reste à l'estimation
initiale, signalée comme telle.
"""

from dataclasses import dataclass

# Une note d'indicateur va de -2 à +2 ; la position d'un axe de -10 à +10.
ECHELLE = 5.0
NOTE_MIN, NOTE_MAX = -2, 2
PAS_NOTE = 0.5  # demi-points : 9 niveaux, ancrages de la grille inchanges

CALCULE, INCOMPLET, ESTIME = "calcule", "incomplet", "estime"


@dataclass(frozen=True)
class Position:
    valeur: float
    statut: str
    notes_utilisees: int
    notes_totales: int

    @property
    def est_calculee(self) -> bool:
        return self.statut == CALCULE

    def resume(self) -> str:
        if self.statut == CALCULE:
            return f"calculé sur {self.notes_utilisees}/{self.notes_totales} indicateurs"
        if self.statut == INCOMPLET:
            return (
                f"estimation initiale : seulement {self.notes_utilisees}/"
                f"{self.notes_totales} indicateurs sourcés"
            )
        return "estimation initiale, aucun indicateur sourcé"


def calculer_axe(
    indicateurs: dict[str, dict],
    definition: dict,
    estimation: float | None,
) -> Position | None:
    """Moyenne pondérée des indicateurs notés, rééchelonnée en -10..+10.

    Les indicateurs absents ou nuls sont retirés et les poids renormalisés sur
    ceux qui restent. Sous le seuil `min_indicateurs`, on retombe sur
    l'estimation initiale plutôt que de publier un chiffre indéfendable.
    """
    poids_par_cle = {
        cle: spec["poids"] for cle, spec in definition["indicateurs"].items()
    }
    total = len(poids_par_cle)

    retenus = []
    for cle, poids in poids_par_cle.items():
        brut = (indicateurs or {}).get(cle)
        valeur = brut.get("valeur") if isinstance(brut, dict) else brut
        if valeur is None:
            # `absent: true` distingue « j'ai cherché, le parti ne se prononce
            # pas » de « pas encore cherché ». Les deux restent hors du calcul :
            # une absence de position n'est pas une position de statu quo.
            continue
        if not NOTE_MIN <= valeur <= NOTE_MAX:
            raise ValueError(
                f"{cle} = {valeur} hors de l'échelle [{NOTE_MIN}, {NOTE_MAX}]"
            )
        if round(valeur / PAS_NOTE) * PAS_NOTE != valeur:
            raise ValueError(f"{cle} = {valeur} n'est pas un multiple de {PAS_NOTE}")
        retenus.append((valeur, poids))

    seuil = definition.get("min_indicateurs", 4)
    if len(retenus) < seuil:
        if estimation is None:
            return None
        statut = INCOMPLET if retenus else ESTIME
        return Position(float(estimation), statut, len(retenus), total)

    somme_poids = sum(poids for _, poids in retenus)
    moyenne = sum(valeur * poids for valeur, poids in retenus) / somme_poids
    return Position(round(moyenne * ECHELLE, 1), CALCULE, len(retenus), total)


def calculer_entite(entite: dict, axes: dict) -> dict[str, Position]:
    """Position de chaque axe pour une entité. Les axes sans position sont omis."""
    estimations = entite.get("estimation_initiale") or {}
    positions = {}
    for nom, definition in axes.items():
        position = calculer_axe(
            entite.get("indicateurs", {}), definition, estimations.get(nom)
        )
        if position is not None:
            positions[nom] = position
    return positions
