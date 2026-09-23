"""Page Méthode : le barème de notation, tel qu'il est tenu dans `data/grille.md`."""

import streamlit as st

from commun import GRILLE_PATH, charger, compte_sourcage, sans_tirets

df, meta, axes, sources, entites = charger()
notees, total = compte_sourcage(df, axes)
st.caption(f"{notees} notes sourcées sur {total} possibles, {len(sources)} sources.")

texte = sans_tirets(GRILLE_PATH.read_text(encoding="utf-8"))
# Un « $ » isolé (« 8,1 G$ ») ouvrirait une formule LaTeX dans st.markdown.
st.markdown(texte.replace("$", r"\$"))
