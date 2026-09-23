"""Compas politique comparé : États-Unis, Canada, Québec, France.

Point d'entrée : déclare les pages, qui vivent dans `vues/`. Les positions
affichées sont calculées par `scoring.py` à partir des indicateurs sourcés de
`data/entities.yaml`. Une entité qui n'a pas assez d'indicateurs notés reste à
son estimation initiale et est dessinée en marqueur creux, pour qu'on ne
confonde jamais une position mesurée avec une intuition.
"""

import streamlit as st

from commun import charger

st.set_page_config(page_title="Compas politique comparé", page_icon="🧭", layout="wide")

page = st.navigation(
    [
        st.Page("vues/carte.py", title="Carte", icon=":material/explore:", default=True),
        st.Page("vues/questionnaire.py", title="Questionnaire", icon=":material/quiz:"),
        st.Page("vues/partis.py", title="Comparer les partis", icon=":material/grid_on:"),
        st.Page("vues/methode.py", title="Méthode", icon=":material/menu_book:"),
    ],
    position="top",
)
page.run()

_, meta, *_ = charger()
st.space("large")
st.caption(
    "Positions estimées à partir des programmes, des votes et des mesures prises."
    + (f" Données au {meta['updated']}." if meta.get("updated") else "")
)
