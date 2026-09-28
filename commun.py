"""Données et réglages visuels partagés par les pages de l'app.

Les positions sont calculées ici, une fois, par `scoring.calculer_entite` : les
pages ne font que les afficher.
"""

import html
import re
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import yaml

from scoring import calculer_entite

RACINE = Path(__file__).parent
DATA_PATH = RACINE / "data" / "entities.yaml"
GRILLE_PATH = RACINE / "data" / "grille.md"

# La forme du marqueur porte le territoire, la couleur porte le parti. Les
# glyphes reprennent ces formes dans le texte ; les drapeaux emoji ne
# s'affichent pas sous Windows.
COUNTRY_STYLE = {
    "États-Unis": {"symbol": "square", "glyphe": "■"},
    "Canada": {"symbol": "diamond", "glyphe": "◆"},
    "Québec": {"symbol": "circle", "glyphe": "●"},
    "France": {"symbol": "triangle-up", "glyphe": "▲"},
}
PAYS = list(COUNTRY_STYLE)

SOUVERAINETE_LIBELLE = {
    "independantiste": "Indépendantiste",
    "nationaliste": "Nationaliste",
    "federaliste": "Fédéraliste",
    "souverainiste": "Souverainiste",
    "continentaliste": "Continentaliste",
    "multilateraliste": "Multilatéraliste",
    "europeen_reformiste": "Européen réformiste",
    "federaliste_europeen": "Fédéraliste européen",
    "unilateraliste": "Unilatéraliste",
}

ECOLOGIE_LIBELLE = {
    "productiviste": "Productiviste",
    "reformiste": "Réformiste",
    "planificateur": "Planificateur",
    "decroissant": "Décroissant",
}

# Libellés des pôles pour le lecteur : « État » et « Marché » seuls ne disent
# pas dans quel sens va l'axe. Les données gardent les termes de la grille.
POLES_AFFICHES = {"economie": ("Redistribution", "Libre marché")}

POLICE = "Inter, sans-serif"
POLICE_TITRES = "Newsreader, serif"


def poles(axe: str, definition: dict) -> tuple[str, str]:
    return POLES_AFFICHES.get(axe, (definition["pole_negatif"], definition["pole_positif"]))


def aide_axe(axe: str, definition: dict) -> str:
    negatif, positif = poles(axe, definition)
    return f"De −10 ({negatif.lower()}) à +10 ({positif.lower()})."


# ------------------------------------------------------------------ typographie
# Les données sont rédigées avec des tirets cadratins ; l'interface n'en montre
# aucun. Conversion à l'affichage, pour ne pas réécrire les textes sourcés.
_TIRET = re.compile(r"\s*—\s*")
# Fin de phrase : ponctuation forte suivie d'une majuscule. Un « ? » dans une
# citation (« … trop larges ? ») ne coupe pas l'incise qui l'entoure.
_FIN_PHRASE = re.compile(r"((?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ«(*]))")
_DEBUT_LIGNE_AUTONOME = re.compile(r"^\s*(#|\||[-*+]\s|\d+\.\s)")


def _phrase_sans_tirets(phrase: str) -> str:
    """Une paire de tirets encadre une incise : parenthèses. Un tiret seul
    introduit une explication : deux-points, ou virgule s'il y en a déjà."""
    morceaux = _TIRET.split(phrase)
    sortie, i = morceaux[0], 1
    while i < len(morceaux):
        if i + 1 < len(morceaux):
            suite = morceaux[i + 1]
            espace = "" if not suite or suite[0] in ",.;:!?)»" else " "
            sortie += f" ({morceaux[i]}){espace}{suite}"
            i += 2
        else:
            if not sortie.strip():
                sortie = morceaux[i]
            else:
                separateur = ", " if " : " in sortie else " : "
                sortie += separateur + morceaux[i]
            i += 1
    return sortie


def _ligne_sans_tirets(ligne: str) -> str:
    # Le groupe capturant garde les espaces entre phrases dans le découpage.
    return "".join(
        _phrase_sans_tirets(bout) if "—" in bout else bout
        for bout in _FIN_PHRASE.split(ligne)
    )


def sans_tirets(texte: str | None) -> str:
    """Retire les tirets cadratins d'un texte affiché, Markdown compris.

    Titres, lignes de tableau et éléments de liste sont traités ligne par ligne,
    les paragraphes phrase par phrase, pour qu'un tiret n'en apparie jamais un
    autre situé dans un bloc voisin. Les blocs de code sont laissés intacts.
    """
    if not texte or "—" not in texte:
        return texte or ""
    segments = texte.split("```")
    for n in range(0, len(segments), 2):  # indices pairs : hors blocs de code
        paragraphes = re.split(r"(\n\s*\n)", segments[n])
        for p, paragraphe in enumerate(paragraphes):
            if "—" not in paragraphe:
                continue
            unites, courante = [], []
            for ligne in paragraphe.split("\n"):
                if _DEBUT_LIGNE_AUTONOME.match(ligne) and courante:
                    unites.append("\n".join(courante))
                    courante = []
                courante.append(ligne)
                if ligne.lstrip().startswith(("#", "|")):
                    unites.append("\n".join(courante))
                    courante = []
            if courante:
                unites.append("\n".join(courante))
            paragraphes[p] = "\n".join(_ligne_sans_tirets(u) for u in unites)
        segments[n] = "".join(paragraphes)
    return "```".join(segments)


def libelle_pays(pays: str) -> str:
    return f"{COUNTRY_STYLE[pays]['glyphe']} {pays}"


# --------------------------------------------------------------------------- data
@st.cache_data
def load_data(path: Path, _mtime: float = 0.0) -> tuple[pd.DataFrame, dict, dict, dict, list]:
    """`_mtime` fait partie de la clé de cache : éditer le YAML recharge l'app."""
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    axes = raw["axes"]
    sources = raw.get("sources", {})

    lignes = []
    for entite in raw["entities"]:
        positions = calculer_entite(entite, axes)
        ligne = {
            "name": entite["name"],
            "sigle": entite.get("sigle") or entite["name"],
            "chef": sans_tirets(entite.get("chef")) or None,
            "country": entite["country"],
            "color": entite["color"],
            "label_pos": entite.get("label_pos") or "top center",
            "resume": sans_tirets((entite.get("resume") or "").strip()),
            "resume_src": entite.get("resume_src") or [],
            "estimation": entite.get("estimation_initiale") or {},
            "souverainete": entite.get("souverainete"),
            "ecologie": entite.get("ecologie"),
            "autorite": sans_tirets((entite.get("autorite") or "").strip()) or None,
            "as_of": entite.get("as_of"),
            "indicateurs": entite.get("indicateurs") or {},
        }
        for axe in axes:
            position = positions.get(axe)
            ligne[axe] = position.valeur if position else None
            ligne[f"{axe}_statut"] = position.statut if position else None
            ligne[f"{axe}_detail"] = position.resume() if position else "aucune donnée"
            ligne[f"{axe}_calcule"] = bool(position and position.est_calculee)
        lignes.append(ligne)

    df = pd.DataFrame(lignes)
    df = df.dropna(subset=list(axes))
    return df, raw.get("meta", {}), axes, sources, raw["entities"]


def charger() -> tuple[pd.DataFrame, dict, dict, dict, list]:
    return load_data(DATA_PATH, DATA_PATH.stat().st_mtime)


def compte_sourcage(df: pd.DataFrame, axes: dict) -> tuple[int, int]:
    """Cellules notées sur cellules possibles : l'avancement réel du projet."""
    par_entite = sum(len(a["indicateurs"]) for a in axes.values())
    notees = sum(
        1
        for ind in df["indicateurs"]
        for cle in ind
        if isinstance(ind[cle], dict) and ind[cle].get("valeur") is not None
    )
    return notees, par_entite * len(df)


def filtre_pays() -> list[str]:
    """Filtre territorial, partagé entre les pages grâce à `persist_state`."""
    choix = st.pills(
        "Territoires", PAYS, selection_mode="multi", default=PAYS,
        format_func=libelle_pays, key="pays", persist_state="session",
        label_visibility="collapsed",
    )
    return choix or []


# ------------------------------------------------------------------ graphiques
def couleurs() -> dict:
    """Encres des graphiques, accordées au thème de `.streamlit/config.toml`."""
    if st.context.theme.type == "dark":
        return {
            "texte": "#ecebe6", "discret": "#a19f97", "grille": "rgba(255,255,255,0.07)",
            "axe": "rgba(255,255,255,0.35)", "surface": "#15171a", "bulle": "#1f2227",
            "anneau": "rgba(236,235,230,0.4)", "neutre": "#383835",
            "quadrant": "rgba(255,255,255,0.025)",
        }
    return {
        "texte": "#1c1b19", "discret": "#6b6862", "grille": "rgba(0,0,0,0.06)",
        "axe": "rgba(0,0,0,0.35)", "surface": "#faf8f3", "bulle": "#ffffff",
        "anneau": "#ffffff", "neutre": "#e9e6df",
        "quadrant": "rgba(0,0,0,0.022)",
    }


def couleur_parti(couleur: str, c: dict) -> str:
    """Couleur d'un parti, éclaircie si elle se confond avec le fond sombre.

    Un marqueur noir sur fond sombre se lirait comme un marqueur creux, c'est-à-dire
    comme une estimation non mesurée : l'erreur de lecture que la carte évite.
    """
    if c["surface"] != "#15171a":
        return couleur
    r, g, b = (int(couleur.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    # Seuil bas : seules les couleurs quasi noires sont touchées, un rouge ou un
    # bleu foncé garde sa teinte (le PCF, le RN).
    return "#8f8d86" if max(r, g, b) < 48 else couleur


def habiller(fig: go.Figure, c: dict, **layout) -> go.Figure:
    """Fond transparent, polices et infobulles de l'app sur une figure Plotly."""
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family=POLICE, color=c["texte"], size=13),
        hoverlabel=dict(bgcolor=c["bulle"], bordercolor=c["axe"],
                        font=dict(family=POLICE, color=c["texte"], size=13)),
        **layout,
    )
    return fig


def entete_html(titre: str, sur_titre: str, sous_titre: str | None, couleur: str) -> str:
    """Bandeau de fiche : filet à la couleur du parti, titre à empattements."""
    sous = (f'<div style="opacity:.7;margin-top:2px">{html.escape(sous_titre)}</div>'
            if sous_titre else "")
    return (
        f'<div style="border-left:5px solid {couleur};padding:2px 0 4px 14px">'
        f'<div style="font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;'
        f'opacity:.65">{html.escape(sur_titre)}</div>'
        f'<div style="font-family:{POLICE_TITRES};font-size:1.7rem;font-weight:700;'
        f'line-height:1.2">{html.escape(titre)}</div>{sous}</div>'
    )
