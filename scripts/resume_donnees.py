"""Résume l'état de `data/entities.yaml` en Markdown, pour les notes de release.

Donne ce qui date une version : nombre de partis et de notes, sources, et la
fraîcheur des fiches (`as_of`) par territoire.
"""

from collections import defaultdict
from pathlib import Path

import yaml

RACINE = Path(__file__).resolve().parent.parent

raw = yaml.safe_load((RACINE / "data" / "entities.yaml").read_text(encoding="utf-8"))
entites = raw["entities"]

notes = absents = 0
dates: dict[str, set[str]] = defaultdict(set)
for e in entites:
    for bloc in (e.get("indicateurs") or {}).values():
        if bloc.get("absent"):
            absents += 1
        elif "valeur" in bloc:
            notes += 1
    dates[e["country"]].add(str(e["as_of"]))

print(f"- {len(entites)} partis, {notes} notes d'indicateur, {absents} absences documentées")
print(f"- {len(raw.get('sources', {}))} sources")
print(f"- Données mises à jour le {raw['meta']['updated']}")
for pays, ds in sorted(dates.items()):
    print(f"- Fiches {pays} : à jour au {', '.join(sorted(ds))}")
