"""Positionnement du répondant et classement de proximité.

Le répondant est positionné par la MÊME fonction que les partis
(`scoring.calculer_axe`), sur les mêmes indicateurs et avec les mêmes poids :
c'est ce qui rend les deux positions comparables.

Le classement de proximité, lui, se calcule **item par item** et non à la
distance entre les deux points de la carte. Les deux réponses diffèrent, et
c'est normal : les axes résument quatorze indicateurs, ils ne les remplacent pas.
Deux partis peuvent occuper le même point en étant en désaccord sur la moitié
des questions.
"""

from dataclasses import dataclass
from pathlib import Path

import yaml

from scoring import NOTE_MAX, NOTE_MIN, calculer_axe

QUESTIONS_PATH = Path(__file__).parent / "data" / "questions.yaml"

# Écart maximal entre deux notes sur l'échelle -2 … +2.
ECART_MAX = NOTE_MAX - NOTE_MIN

# En deçà, le pourcentage d'accord repose sur trop peu d'items pour être montré.
MIN_ITEMS_COMPARES = 5


@dataclass(frozen=True)
class Accord:
    nom: str
    pourcentage: float
    items_compares: int
    items_total: int
    desaccords: list[tuple[str, float, float]]  # (indicateur, répondant, parti)

    @property
    def fiable(self) -> bool:
        return self.items_compares >= MIN_ITEMS_COMPARES


def charger_questions(path: Path = QUESTIONS_PATH) -> tuple[list[dict], dict]:
    raw = yaml.safe_load(open(path, encoding="utf-8"))
    return raw["items"], raw.get("meta", {})


def reponses_vers_notes(reponses: dict[str, int | None], items: list[dict]) -> dict:
    """Traduit les réponses brutes en notes d'indicateur, en appliquant `sens`.

    Une réponse absente ou « sans opinion » (None) laisse l'indicateur vide :
    il sera retiré du calcul et les poids renormalisés, jamais compté comme 0.
    """
    notes = {}
    for item in items:
        cle = item["indicateur"]
        reponse = reponses.get(cle)
        if reponse is None:
            continue
        notes[cle] = {"valeur": reponse * item["sens"]}
    return notes


def positionner(reponses: dict[str, int | None], items: list[dict], axes: dict) -> dict:
    """Position du répondant sur chaque axe, par la fonction des partis."""
    notes = reponses_vers_notes(reponses, items)
    positions = {}
    for nom, definition in axes.items():
        # `estimation=None` : sous le seuil, le répondant n'a pas de position de
        # repli, contrairement aux partis. L'axe reste simplement non calculé.
        position = calculer_axe(notes, definition, estimation=None)
        if position is not None:
            positions[nom] = position
    return positions


def accord_avec(
    reponses: dict[str, int | None],
    entite_indicateurs: dict,
    items: list[dict],
    poids_par_cle: dict[str, float],
) -> Accord | None:
    """Pourcentage d'accord item par item entre le répondant et une entité."""
    notes_repondant = reponses_vers_notes(reponses, items)

    somme_poids = 0.0
    somme_accord = 0.0
    compares = 0
    desaccords: list[tuple[str, float, float]] = []

    for cle, brut_repondant in notes_repondant.items():
        brut_parti = entite_indicateurs.get(cle)
        if not isinstance(brut_parti, dict):
            continue
        valeur_parti = brut_parti.get("valeur")
        if valeur_parti is None:
            continue

        valeur_repondant = brut_repondant["valeur"]
        poids = poids_par_cle.get(cle, 1.0)
        ecart = abs(valeur_repondant - valeur_parti)

        somme_accord += (1 - ecart / ECART_MAX) * poids
        somme_poids += poids
        compares += 1
        if ecart >= 2:
            desaccords.append((cle, valeur_repondant, valeur_parti))

    if not somme_poids:
        return None

    desaccords.sort(key=lambda d: abs(d[1] - d[2]), reverse=True)
    return Accord(
        nom="",
        pourcentage=round(100 * somme_accord / somme_poids, 1),
        items_compares=compares,
        items_total=len(notes_repondant),
        desaccords=desaccords,
    )


def classement(
    reponses: dict[str, int | None],
    entites: list[dict],
    items: list[dict],
    axes: dict,
) -> list[Accord]:
    """Toutes les entités, de la plus proche à la plus éloignée."""
    poids_par_cle = {
        cle: spec["poids"]
        for axe in axes.values()
        for cle, spec in axe["indicateurs"].items()
    }

    resultats = []
    for entite in entites:
        accord = accord_avec(
            reponses, entite.get("indicateurs") or {}, items, poids_par_cle
        )
        if accord is None:
            continue
        resultats.append(
            Accord(
                nom=entite["name"],
                pourcentage=accord.pourcentage,
                items_compares=accord.items_compares,
                items_total=accord.items_total,
                desaccords=accord.desaccords,
            )
        )

    resultats.sort(key=lambda a: a.pourcentage, reverse=True)
    return resultats
