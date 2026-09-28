"""Construit le site statique (GitHub Pages) dans `_site/`.

Les positions des partis sont calculées ici, une fois, par `scoring.py` : le
navigateur ne fait que les afficher. Le questionnaire, lui, exécute dans le
navigateur (Pyodide) les fichiers `scoring.py` et `questionnaire.py` copiés tels
quels, pour que le répondant soit placé par la fonction même qui place les
partis.

Les textes sont nettoyés de leurs tirets cadratins (`commun.sans_tirets`) puis
convertis de Markdown en HTML : le navigateur ne reçoit que du HTML prêt.

    uv run --group site python scripts/construire_site.py
"""

import json
import re
import shutil
import sys
from pathlib import Path

import markdown
import yaml

RACINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE))

from commun import (COUNTRY_STYLE, ECOLOGIE_LIBELLE, POLES_AFFICHES,  # noqa: E402
                    SOUVERAINETE_LIBELLE, sans_tirets)
from scoring import calculer_entite  # noqa: E402

SOURCE = RACINE / "site"
SORTIE = RACINE / "_site"


def html(texte: str | None, en_ligne: bool = False) -> str:
    """Markdown → HTML, sans tirets cadratins. `en_ligne` retire le <p> englobant."""
    texte = sans_tirets((texte or "").strip())
    if not texte:
        return ""
    rendu = markdown.markdown(texte, extensions=["tables", "sane_lists"])
    # Les liens sortent du site : nouvel onglet, sans fuite de référent.
    rendu = rendu.replace("<a href=", '<a target="_blank" rel="noopener" href=')
    if en_ligne and rendu.startswith("<p>") and rendu.endswith("</p>") and rendu.count("<p>") == 1:
        rendu = rendu[3:-4]
    return rendu


def identifiant(sigle: str) -> str:
    """Identifiant d'URL stable, tiré du sigle : `#/carte/ps`, `#/carte/caq`."""
    ascii_ = sigle.lower()
    for a, b in [("[àâä]", "a"), ("[éèêë]", "e"), ("[îï]", "i"), ("[ôö]", "o"), ("[ûüù]", "u"), ("ç", "c")]:
        ascii_ = re.sub(a, b, ascii_)
    return re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")


def construire() -> dict:
    brut = yaml.safe_load((RACINE / "data" / "entities.yaml").read_text(encoding="utf-8"))
    questions = yaml.safe_load((RACINE / "data" / "questions.yaml").read_text(encoding="utf-8"))
    axes = brut["axes"]

    partis = []
    for e in brut["entities"]:
        positions = calculer_entite(e, axes)
        indicateurs = {}
        for cle, bloc in (e.get("indicateurs") or {}).items():
            indicateurs[cle] = {
                "valeur": bloc.get("valeur"),
                "absent": bool(bloc.get("absent")),
                "just": html(bloc.get("just")),
                "contest": html(bloc.get("contest")),
                "src": bloc.get("src") or [],
            }
        souv, eco = e.get("souverainete"), e.get("ecologie")
        partis.append({
            "id": identifiant(e.get("sigle") or e["name"]),
            "nom": e["name"],
            "sigle": e.get("sigle") or e["name"],
            "chef": sans_tirets(e.get("chef")) or None,
            "pays": e["country"],
            "couleur": e["color"],
            "etiquette": e.get("label_pos") or "top center",
            "resume": html(e.get("resume")),
            "resume_src": e.get("resume_src") or [],
            "souverainete": SOUVERAINETE_LIBELLE.get(souv, souv) if souv else None,
            "ecologie": ECOLOGIE_LIBELLE.get(eco, eco) if eco else None,
            "autorite": html(e.get("autorite")),
            "as_of": e.get("as_of"),
            "positions": {
                axe: {"valeur": p.valeur, "mesuree": p.est_calculee}
                for axe, p in positions.items()
            },
            "indicateurs": indicateurs,
        })

    return {
        "meta": {"mise_a_jour": brut.get("meta", {}).get("updated")},
        "partis": partis,
        "pays": [{"nom": nom, "forme": style["symbol"]} for nom, style in COUNTRY_STYLE.items()],
        "axes": {
            nom: {
                "libelle": d["libelle"],
                "poles": list(POLES_AFFICHES.get(nom, (d["pole_negatif"], d["pole_positif"]))),
                "indicateurs": [
                    {"cle": cle, "libelle": spec["libelle"], "poids": spec["poids"]}
                    for cle, spec in d["indicateurs"].items()
                ],
            }
            for nom, d in axes.items()
        },
        "sources": {
            cle: {
                "titre": sans_tirets(s.get("titre")),
                "url": s.get("url"),
                "auteur": sans_tirets(s.get("auteur")),
                "acces": sans_tirets(s.get("acces")) or None,
            }
            for cle, s in (brut.get("sources") or {}).items()
        },
        "questionnaire": {
            "echelle": {str(k): v for k, v in questions["meta"]["echelle"].items()},
            "sans_opinion": html(questions["meta"].get("sans_opinion")),
            "items": [
                {
                    "indicateur": q["indicateur"],
                    "enonce": html(q["enonce"], en_ligne=True),
                    "exemples": {p: html(x, en_ligne=True) for p, x in (q.get("exemples") or {}).items()},
                }
                for q in questions["items"]
            ],
        },
        "grille": html((RACINE / "data" / "grille.md").read_text(encoding="utf-8")),
        # Données brutes pour Pyodide : ce que `questionnaire.py` lit, sans plus.
        "calcul": {
            "axes": axes,
            "items": questions["items"],
            "entites": [
                {
                    "name": e["name"],
                    "indicateurs": {
                        cle: {"valeur": b.get("valeur")}
                        for cle, b in (e.get("indicateurs") or {}).items()
                        if b.get("valeur") is not None
                    },
                }
                for e in brut["entities"]
            ],
        },
    }


def main() -> None:
    if SORTIE.exists():
        shutil.rmtree(SORTIE)
    shutil.copytree(SOURCE, SORTIE)
    (SORTIE / "python").mkdir()
    for module in ("scoring.py", "questionnaire.py"):
        shutil.copy(RACINE / module, SORTIE / "python" / module)
    donnees = construire()
    (SORTIE / "donnees.json").write_text(json.dumps(donnees, ensure_ascii=False), encoding="utf-8")
    ids = [p["id"] for p in donnees["partis"]]
    if len(set(ids)) != len(ids):
        sys.exit(f"Identifiants de partis en double : {ids}")
    print(f"Site construit dans {SORTIE.relative_to(RACINE)}/")


if __name__ == "__main__":
    main()
