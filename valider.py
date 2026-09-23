"""Vérifie l'intégrité de `data/entities.yaml`.

À lancer après chaque lot de notation : `uv run python valider.py`.

Les erreurs visées sont celles qui ne provoquent aucun plantage et passent donc
inaperçues — une note qui référence une source inexistante s'affiche simplement
sans sources, ce qui est exactement ce que ce projet cherche à rendre
impossible.
"""

import sys
from pathlib import Path

import yaml

from scoring import NOTE_MAX, NOTE_MIN, PAS_NOTE

DATA_PATH = Path(__file__).parent / "data" / "entities.yaml"


def valider(path: Path) -> tuple[list[str], list[str]]:
    raw = yaml.safe_load(open(path, encoding="utf-8"))
    axes, sources = raw["axes"], raw.get("sources", {})
    cles_valides = {c for a in axes.values() for c in a["indicateurs"]}
    erreurs: list[str] = []
    avertissements: list[str] = []
    sources_citees: set[str] = set()

    for entite in raw["entities"]:
        nom = entite.get("name", "<sans nom>")

        for champ in ("sigle", "country", "color", "as_of"):
            if not entite.get(champ):
                erreurs.append(f"{nom} : champ `{champ}` manquant")

        estimation = entite.get("estimation_initiale") or {}
        for axe in axes:
            if axe not in estimation:
                avertissements.append(
                    f"{nom} : pas d'`estimation_initiale` pour `{axe}` — "
                    "l'entité disparaît de la carte sous le seuil"
                )

        for nom_src in entite.get("resume_src") or []:
            sources_citees.add(nom_src)
            if nom_src not in sources:
                erreurs.append(f"{nom} : `resume_src` inconnue `{nom_src}`")

        for cle, brut in (entite.get("indicateurs") or {}).items():
            ref = f"{nom} / {cle}"
            if cle not in cles_valides:
                erreurs.append(f"{ref} : indicateur inconnu des axes")
                continue
            if not isinstance(brut, dict):
                erreurs.append(f"{ref} : doit être un bloc, pas {type(brut).__name__}")
                continue

            valeur, absent = brut.get("valeur"), brut.get("absent")
            if valeur is not None and absent:
                erreurs.append(f"{ref} : `valeur` et `absent` sont exclusifs")
            if valeur is None and not absent:
                erreurs.append(f"{ref} : ni `valeur` ni `absent: true`")
            if valeur is not None:
                if not NOTE_MIN <= valeur <= NOTE_MAX:
                    erreurs.append(f"{ref} : {valeur} hors de [{NOTE_MIN}, {NOTE_MAX}]")
                elif round(valeur / PAS_NOTE) * PAS_NOTE != valeur:
                    erreurs.append(f"{ref} : {valeur} n'est pas un multiple de {PAS_NOTE}")

            if not (brut.get("just") or "").strip():
                erreurs.append(f"{ref} : justification vide")

            inconnus = set(brut) - {"valeur", "absent", "just", "src", "contest"}
            if inconnus:
                erreurs.append(
                    f"{ref} : champ(s) inconnu(s) {sorted(inconnus)} — "
                    "ils ne seraient affichés nulle part"
                )

            refs = brut.get("src") or []
            sources_citees.update(refs)
            for nom_src in refs:
                if nom_src not in sources:
                    erreurs.append(f"{ref} : source inconnue `{nom_src}`")
            # Une note chiffrée sans source est exactement ce que la méthode
            # interdit ; une absence peut légitimement n'en avoir aucune.
            if valeur is not None and not refs:
                erreurs.append(f"{ref} : note chiffrée sans aucune source")

    for nom_src, src in sources.items():
        for champ in ("titre", "url", "rang"):
            if not src.get(champ):
                erreurs.append(f"source `{nom_src}` : champ `{champ}` manquant")
        if nom_src not in sources_citees:
            avertissements.append(f"source `{nom_src}` : déclarée mais jamais citée")

    return erreurs, avertissements


def main() -> int:
    erreurs, avertissements = valider(DATA_PATH)

    for message in avertissements:
        print(f"  avertissement  {message}")
    for message in erreurs:
        print(f"  ERREUR         {message}")

    if erreurs:
        print(f"\n{len(erreurs)} erreur(s), {len(avertissements)} avertissement(s)")
        return 1
    print(f"\nValide. {len(avertissements)} avertissement(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
