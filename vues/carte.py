"""Page Carte : les partis sur les deux axes, et la fiche sourcée du parti choisi."""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from commun import (COUNTRY_STYLE, ECOLOGIE_LIBELLE, SOUVERAINETE_LIBELLE, aide_axe, charger,
                    couleur_parti, couleurs, entete_html, filtre_pays, habiller, libelle_pays,
                    poles, sans_tirets)

HAUTEUR = 640  # carte et panneau de fiche, alignés


# -------------------------------------------------------------------------- figure
def build_figure(df: pd.DataFrame, axes: dict, show_labels: bool, selected: str | None,
                 repondant: dict | None = None) -> go.Figure:
    eco = axes["economie"]
    (eco_neg, eco_pos), (soc_neg, soc_pos) = poles("economie", eco), poles("societe", axes["societe"])
    c = couleurs()
    fig = go.Figure()

    # Deux quadrants sur quatre légèrement teintés, en damier : assez pour
    # repérer les zones, pas assez pour concurrencer les couleurs des partis.
    for (x0, x1, y0, y1) in [(-10, 0, 0, 10), (0, 10, -10, 0)]:
        fig.add_shape(type="rect", x0=x0, x1=x1, y0=y0, y1=y1,
                      fillcolor=c["quadrant"], line_width=0, layer="below")

    fig.add_hline(y=0, line_width=1, line_color=c["axe"], layer="below")
    fig.add_vline(x=0, line_width=1, line_color=c["axe"], layer="below")

    # Les pôles sont écrits au bout des axes, dans le tracé : pas de titre d'axe
    # qui dispute la marge aux graduations.
    pole = dict(size=11, color=c["discret"])
    for x, y, xa, ya, text in [
        (-11.4, 0, "left", "bottom", f"← {eco_neg}"),
        (11.4, 0, "right", "bottom", f"{eco_pos} →"),
        (0, 11.4, "left", "top", f" ↑ {soc_pos}"),
        (0, -11.4, "left", "bottom", f" ↓ {soc_neg}"),
    ]:
        fig.add_annotation(x=x, y=y, text=text.upper(), showarrow=False,
                           xanchor=xa, yanchor=ya, font=pole)

    for country, sub in df.groupby("country", sort=False):
        style = COUNTRY_STYLE.get(country, {"symbol": "circle"})
        # Marqueur creux tant que les deux axes ne sont pas calculés.
        mesure = sub["economie_calcule"] & sub["societe_calcule"]
        symbols = [style["symbol"] if m else f"{style['symbol']}-open" for m in mesure]
        sizes = [22 if n == selected else 14 for n in sub["name"]]
        # Anneau de la couleur du fond : sépare les marqueurs qui se chevauchent
        # et garde lisibles les partis dont la couleur est proche du fond.
        widths = [3 if n == selected else 1.5 for n in sub["name"]]
        rings = [c["texte"] if n == selected else c["anneau"] for n in sub["name"]]
        fig.add_trace(go.Scatter(
            x=sub["economie"],
            y=sub["societe"],
            mode="markers+text" if show_labels else "markers",
            name=country,
            showlegend=False,
            text=sub["sigle"],
            textposition=sub["label_pos"].tolist(),
            textfont=dict(size=12, color=c["texte"], shadow="auto"),
            customdata=sub[["name", "chef", "economie_detail", "societe_detail"]].values,
            marker=dict(size=sizes, color=[couleur_parti(x, c) for x in sub["color"]],
                        symbol=symbols,
                        line=dict(width=widths, color=rings)),
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>%{customdata[1]}"
                f"<br><br>{eco['libelle']} : <b>%{{x:+.1f}}</b>"
                f"<br>{axes['societe']['libelle']} : <b>%{{y:+.1f}}</b><extra></extra>"
            ),
        ))

    if repondant:
        fig.add_trace(go.Scatter(
            x=[repondant["economie"]], y=[repondant["societe"]],
            mode="markers+text", name="Vous", text=["Vous"], showlegend=False,
            textposition="top center",
            textfont=dict(size=13, color=c["texte"], shadow="auto"),
            marker=dict(size=24, color=c["texte"], symbol="star",
                        line=dict(width=2, color=c["anneau"])),
            hovertemplate="<b>Vous</b><br>%{x:+.1f} / %{y:+.1f}<extra></extra>",
        ))

    # `constrain="domain"` : le carré se réduit dans son cadre au lieu d'élargir
    # la plage de l'axe, ce qui décalait les quadrants par rapport aux axes. La
    # marge au-delà de ±10 laisse la place aux sigles des partis aux bornes.
    axe_commun = dict(
        range=[-11.6, 11.6], zeroline=False, tickvals=[-10, -5, 5, 10], showgrid=True,
        gridcolor=c["grille"], tickfont=dict(color=c["discret"], size=10),
        constrain="domain", showline=False,
    )
    habiller(
        fig, c,
        height=HAUTEUR,
        margin=dict(l=0, r=0, t=0, b=0),
        clickmode="event+select",
        dragmode="pan",
        showlegend=False,
        xaxis=axe_commun,
        yaxis=dict(**axe_commun, scaleanchor="x", scaleratio=1),
    )
    return fig


# ---------------------------------------------------------------------- fiche
def afficher_sources(brut: dict, sources: dict) -> None:
    refs = [sources[cle] for cle in brut.get("src", []) if cle in sources]
    if not refs:
        return
    st.caption("Sources")
    for ref in refs:
        ligne = f"- [{sans_tirets(ref['titre'])}]({ref['url']}) · {sans_tirets(ref.get('auteur'))}"
        if ref.get("acces"):
            ligne += f" · :orange[{sans_tirets(ref['acces'])}]"
        st.markdown(ligne)


def render_indicateurs(row: pd.Series, definition: dict, sources: dict) -> None:
    notes = row["indicateurs"]
    for cle, spec in definition["indicateurs"].items():
        brut = notes.get(cle)
        valeur = brut.get("valeur") if isinstance(brut, dict) else None
        if valeur is None:
            # `absent` : recherché, le parti ne se prononce pas ; distinct de
            # « pas encore cherché », et dans les deux cas hors du calcul.
            if isinstance(brut, dict) and brut.get("absent"):
                with st.expander(f"{spec['libelle']} · :orange[sans position]"):
                    st.markdown(sans_tirets(brut.get("just", "").strip()))
                    afficher_sources(brut, sources)
            else:
                st.caption(f"{spec['libelle']} · non sourcé")
            continue
        contest = " :orange[:material/warning:]" if brut.get("contest") else ""
        with st.expander(f"{spec['libelle']} · **{valeur:+g}**{contest}"):
            st.markdown(sans_tirets(brut.get("just", "").strip()))
            if brut.get("contest"):
                st.warning(f"Score discutable : {sans_tirets(brut['contest'].strip())}")
            afficher_sources(brut, sources)


def render_fiche(row: pd.Series, axes: dict, sources: dict) -> None:
    st.html(entete_html(row["name"], libelle_pays(row["country"]), row["chef"], row["color"]))

    cols = st.columns(len(axes))
    for col, (axe, definition) in zip(cols, axes.items()):
        col.metric(definition["libelle"], f"{row[axe]:+.1f}", border=True,
                   help=aide_axe(axe, definition))
        if not row[f"{axe}_calcule"]:
            col.caption(":orange[Position estimée, pas encore mesurée]")

    attributs = []
    if row["souverainete"]:
        attributs.append(f":violet-badge[Souveraineté : {SOUVERAINETE_LIBELLE.get(row['souverainete'], row['souverainete'])}]")
    if row["ecologie"]:
        attributs.append(f":green-badge[Écologie : {ECOLOGIE_LIBELLE.get(row['ecologie'], row['ecologie'])}]")
    if attributs:
        st.markdown(" ".join(attributs))

    st.markdown(row["resume"])

    onglets = st.tabs([d["libelle"] for d in axes.values()] + ["Hors axes"])
    for onglet, definition in zip(onglets, axes.values()):
        with onglet:
            render_indicateurs(row, definition, sources)
    with onglets[-1]:
        if row["autorite"]:
            st.markdown("**Rapport à l'autorité**")
            st.write(row["autorite"])
        if row["resume_src"]:
            st.markdown("**Sources du résumé**")
            afficher_sources({"src": row["resume_src"]}, sources)


# ---------------------------------------------------------------------------- page
df, meta, axes, sources, entites = charger()

st.title("Politiscope")
st.caption(f"{len(df)} partis de quatre territoires, placés sur les mêmes axes.")

with st.container(horizontal=True, vertical_alignment="center"):
    chosen = filtre_pays()
    st.space("stretch")
    show_labels = st.toggle("Sigles", value=True, key="noms", persist_state="session")

if not chosen:
    st.info("Sélectionnez au moins un territoire.")
    st.stop()

view = df[df["country"].isin(chosen)].reset_index(drop=True)
names = view["name"].tolist()

if st.session_state.get("fiche") not in names:
    st.session_state["fiche"] = None
selected = st.session_state["fiche"]
repondant = st.session_state.get("repondant")

chart_col, info_col = st.columns([3, 2], gap="medium")

with chart_col:
    event = st.plotly_chart(
        build_figure(view, axes, show_labels, selected, repondant),
        width="stretch",
        theme=None,
        on_select="rerun",
        selection_mode="points",
        key="compass",
        config={"displaylogo": False, "scrollZoom": True,
                "modeBarButtonsToRemove": ["select2d", "lasso2d"]},
    )
    points = event.selection.points if event and event.selection else []
    if points and "customdata" in points[0]:
        clicked = points[0]["customdata"][0]
        # On ne réagit qu'à un nouveau clic, pour ne pas écraser le choix du menu
        if clicked != st.session_state.get("last_click"):
            st.session_state["last_click"] = clicked
            st.session_state["fiche"] = clicked
            st.rerun()

with info_col:
    st.selectbox("Fiche", names, index=None, placeholder="Choisir un parti…",
                 key="fiche", label_visibility="collapsed")
    # Hauteur fixe : la fiche défile dans son cadre, la carte reste en vue.
    with st.container(border=True, height=HAUTEUR - 56):
        if selected:
            render_fiche(view[view["name"] == selected].iloc[0], axes, sources)
        else:
            st.markdown("**Cliquez sur un point** pour ouvrir la fiche d'un parti.")
            if not (view["economie_calcule"] & view["societe_calcule"]).all():
                st.caption("Marqueur creux : position estimée, pas encore mesurée.")
            if not repondant and st.button("Me situer sur la carte",
                                           icon=":material/quiz:", type="primary"):
                st.switch_page("vues/questionnaire.py")
