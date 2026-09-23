"""Page Questionnaire : position du répondant et classement d'accord."""

import pandas as pd
import streamlit as st

from commun import PAYS, aide_axe, charger, entete_html, libelle_pays, sans_tirets
from questionnaire import charger_questions, classement, positionner

LIKERT = [2, 1, 0, -1, -2]
SANS_OPINION = "sans_opinion"  # `None` voudrait dire « rien de sélectionné »


def afficher_resultats(reponses: dict, items: list[dict], axes: dict,
                       entites: list[dict], df: pd.DataFrame) -> None:
    positions = positionner(reponses, items, axes)
    if len(positions) < len(axes):
        st.warning("Trop de « sans opinion » pour vous placer sur les deux axes.")
        return

    st.session_state["repondant"] = {axe: p.valeur for axe, p in positions.items()}
    resultats = classement(reponses, entites, items, axes)
    pays_de = dict(zip(df["name"], df["country"]))
    couleur_de = dict(zip(df["name"], df["color"]))

    st.header("Votre résultat", anchor="resultat")
    gauche, droite = st.columns([2, 3], gap="large")

    with gauche:
        cols = st.columns(len(axes))
        for col, (axe, definition) in zip(cols, axes.items()):
            position = positions[axe]
            col.metric(definition["libelle"], f"{position.valeur:+.1f}", border=True,
                       help=aide_axe(axe, definition))
        if resultats:
            premier = resultats[0]
            with st.container(border=True):
                st.caption("Votre plus fort accord")
                st.html(entete_html(premier.nom, libelle_pays(pays_de[premier.nom]),
                                    f"{premier.pourcentage:.0f} % d'accord",
                                    couleur_de[premier.nom]))
        if st.button("Me voir sur la carte", icon=":material/explore:", type="primary",
                     width="stretch"):
            st.switch_page("vues/carte.py")

    with droite:
        tableau = pd.DataFrame([
            {"Parti": a.nom, "Territoire": libelle_pays(pays_de[a.nom]),
             "Accord": a.pourcentage}
            for a in resultats
        ])
        st.dataframe(
            tableau, hide_index=True, width="stretch", height=420,
            column_config={
                "Accord": st.column_config.ProgressColumn(
                    "Accord", min_value=0, max_value=100, format="%.0f %%"),
            },
        )
        peu_fiables = [a.nom for a in resultats if not a.fiable]
        if peu_fiables:
            st.caption("Résultat peu fiable pour : " + ", ".join(peu_fiables))

    # Le point le plus proche sur la carte n'est pas forcement le premier du
    # classement d'accord : les axes resument les indicateurs, ils ne les
    # remplacent pas. On le signale plutot que de laisser croire a un bug.
    vous = st.session_state["repondant"]
    distances = df.assign(
        d=((df["economie"] - vous["economie"]) ** 2
           + (df["societe"] - vous["societe"]) ** 2) ** 0.5
    ).sort_values("d")
    plus_proche_carte = distances.iloc[0]["name"]
    if resultats and plus_proche_carte != resultats[0].nom:
        st.caption(
            f"Sur la carte, votre plus proche voisin est {plus_proche_carte}. "
            "La carte résume vos réponses en deux chiffres ; le classement, "
            "lui, les compare une à une."
        )

    if resultats and resultats[0].desaccords:
        with st.expander(f"Vos désaccords avec {resultats[0].nom}"):
            noms = {cle: spec["libelle"]
                    for axe in axes.values()
                    for cle, spec in axe["indicateurs"].items()}
            for cle, vous_, parti in resultats[0].desaccords:
                st.markdown(
                    f"- **{noms.get(cle, cle)}** : vous {vous_:+g}, "
                    f"{resultats[0].nom} {parti:+g}"
                )


# ---------------------------------------------------------------------------- page
df, meta, axes, sources, entites = charger()
items, meta_q = charger_questions()
libelles = meta_q.get("echelle", {})

st.title("Où vous situez-vous ?")
st.caption(f"{len(items)} affirmations. Vous êtes placé avec la même formule que les partis.")
with st.expander("Comment c'est calculé", icon=":material/info:"):
    # Asymétrie à dire au répondant : voir l'en-tête de data/questions.yaml.
    st.markdown(
        "Vous répondez à **une** affirmation par thème ; les partis ont été "
        "notés sur leurs programmes, leurs votes et leurs mesures. On compare "
        "donc le sens et la force d'une préférence, pas une équivalence exacte."
    )
    st.markdown(sans_tirets(meta_q.get("sans_opinion", "").strip()))

territoire = st.pills(
    "Exemples tirés de", PAYS, default="Québec", format_func=libelle_pays,
    key="exemples", persist_state="session", required=True,
)

axe_de = {cle: axe for axe, d in axes.items() for cle in d["indicateurs"]}
reponses: dict[str, int | None] = {}

with st.form("questionnaire", border=False):
    numero = 0
    for axe, definition in axes.items():
        st.subheader(definition["libelle"])
        for item in items:
            cle = item["indicateur"]
            if axe_de.get(cle) != axe:
                continue
            numero += 1
            with st.container(border=True):
                st.markdown(f"**{numero}.** {sans_tirets(item['enonce'].strip())}")
                exemple = (item.get("exemples") or {}).get(territoire)
                if exemple:
                    st.caption(sans_tirets(exemple))
                choix = st.segmented_control(
                    f"Réponse {numero}", LIKERT + [SANS_OPINION],
                    format_func=lambda v: libelles.get(v, "Sans opinion"),
                    default=0, required=True, key=f"q_{cle}",
                    persist_state="session", label_visibility="collapsed",
                )
            reponses[cle] = None if choix == SANS_OPINION else choix
    envoye = st.form_submit_button("Voir mon résultat", type="primary",
                                   icon=":material/arrow_forward:")

if envoye:
    st.session_state["reponses"] = reponses

if st.session_state.get("reponses"):
    st.space("large")
    afficher_resultats(st.session_state["reponses"], items, axes, entites, df)
