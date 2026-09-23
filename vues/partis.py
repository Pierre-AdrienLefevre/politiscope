"""Page Comparer : tous les partis sur tous les indicateurs, en une matrice."""

import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

from commun import aide_axe, charger, couleurs, filtre_pays, habiller, libelle_pays, poles

# Divergente sans connotation partisane : bleu et rouge désignent la gauche en
# France et la droite aux États-Unis, ils seraient lus à l'envers d'un côté.
POLE_NEGATIF, POLE_POSITIF = "#1b8a8f", "#c9731f"


def matrice(view, axes: dict) -> go.Figure:
    c = couleurs()
    echelle = [[0, POLE_NEGATIF], [0.5, c["neutre"]], [1, POLE_POSITIF]]
    pole_neg = " ou ".join(poles(a, d)[0].lower() for a, d in axes.items())
    pole_pos = " ou ".join(poles(a, d)[1].lower() for a, d in axes.items())
    lignes = [f"{nom}  " for nom in view["name"]]
    fig = make_subplots(
        rows=1, cols=len(axes), shared_yaxes=True, horizontal_spacing=0.02,
        column_widths=[len(d["indicateurs"]) for d in axes.values()],
    )
    for col, definition in enumerate(axes.values(), start=1):
        cles = list(definition["indicateurs"])
        z, textes, survols = [], [], []
        for notes in view["indicateurs"]:
            rz, rt, rs = [], [], []
            for cle in cles:
                brut = notes.get(cle)
                valeur = brut.get("valeur") if isinstance(brut, dict) else None
                if valeur is not None:
                    rz.append(valeur)
                    rt.append(f"{valeur:+g}".replace(".", ",") if valeur else "0")
                    rs.append(f"{valeur:+g}")
                elif isinstance(brut, dict) and brut.get("absent"):
                    rz.append(float("nan"))
                    rt.append("∅")
                    rs.append("sans position (recherche faite)")
                else:
                    rz.append(float("nan"))
                    rt.append("?")
                    rs.append("non sourcé")
            z.append(rz)
            textes.append(rt)
            survols.append(rs)
        fig.add_trace(go.Heatmap(
            z=z, x=[definition["indicateurs"][k]["libelle"] for k in cles], y=lignes,
            zmin=-2, zmax=2, colorscale=echelle, showscale=col == 1,
            xgap=2, ygap=2, text=textes, texttemplate="%{text}",
            textfont=dict(size=11),  # couleur auto, contrastée selon la case
            customdata=survols,
            hovertemplate="<b>%{y}</b><br>%{x} : %{customdata}<extra></extra>",
            colorbar=dict(orientation="h", y=-0.02, yanchor="top", len=0.5, thickness=10,
                          tickvals=[-2, 0, 2], outlinewidth=0,
                          ticktext=[f"−2 {pole_neg}", "0", f"+2 {pole_pos}"],
                          tickfont=dict(color=c["discret"], size=11)),
        ), row=1, col=col)
        fig.update_xaxes(title=dict(text=f"<b>{definition['libelle']}</b>", standoff=12,
                                    font=dict(size=13, color=c["texte"])), row=1, col=col)

    habiller(
        fig, c,
        height=30 * len(view) + 230,
        margin=dict(l=0, r=0, t=10, b=70),
    )
    # `automargin` : la marge s'ajuste aux noms de partis et d'indicateurs au
    # lieu de les couper.
    fig.update_xaxes(side="top", tickangle=-40, tickfont=dict(size=11, color=c["texte"]),
                     fixedrange=True, showgrid=False, automargin=True, ticks="")
    fig.update_yaxes(autorange="reversed", fixedrange=True, showgrid=False,
                     automargin=True, ticks="", tickfont=dict(size=12, color=c["texte"]))
    return fig


# ---------------------------------------------------------------------------- page
df, meta, axes, sources, entites = charger()

st.title("Comparer les partis")
st.caption("Les notes de chaque parti, thème par thème.")

chosen = filtre_pays()
if not chosen:
    st.info("Sélectionnez au moins un territoire.")
    st.stop()

view = (df[df["country"].isin(chosen)]
        .assign(_ordre=lambda d: d["country"].map({p: i for i, p in enumerate(chosen)}))
        .sort_values(["_ordre", "economie"])
        .reset_index(drop=True))

tab_matrice, tab_positions = st.tabs([":material/grid_on: Indicateurs",
                                      ":material/table_rows: Positions"])

with tab_matrice:
    st.plotly_chart(matrice(view, axes), theme=None, width="stretch",
                    config={"displayModeBar": False})
    st.caption("∅ le parti ne se prononce pas · ? pas encore recherché")

with tab_positions:
    table = view.assign(Territoire=view["country"].map(libelle_pays))[
        ["name", "chef", "Territoire", "economie", "societe"]
    ]
    st.dataframe(
        table, hide_index=True, width="stretch",
        column_config={
            "name": "Parti", "chef": "Chef",
            **{axe: st.column_config.NumberColumn(
                d["libelle"], format="%+.1f", help=aide_axe(axe, d))
               for axe, d in axes.items()},
        },
    )
