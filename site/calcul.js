// Calcul du questionnaire dans le navigateur, par Pyodide.
//
// Le répondant est placé par `questionnaire.positionner`, qui appelle
// `scoring.calculer_axe` : la fonction même qui a placé les partis lors de la
// construction du site. Les deux fichiers Python sont copiés tels quels dans
// `python/` ; rien n'est réécrit en JavaScript. Les réponses ne quittent pas le
// navigateur.

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

let pret = null;

/** Télécharge Python et les deux modules. Appelé dès l'ouverture du
 * questionnaire : le chargement se fait pendant que le visiteur répond. */
export function preparer() {
  if (!pret) {
    pret = (async () => {
      const { loadPyodide } = await import(PYODIDE + "pyodide.mjs");
      const py = await loadPyodide({ indexURL: PYODIDE });
      await py.loadPackage("pyyaml"); // importé en tête de questionnaire.py
      for (const module of ["scoring", "questionnaire"]) {
        const source = await (await fetch(`python/${module}.py`)).text();
        py.FS.writeFile(`/home/pyodide/${module}.py`, source);
      }
      py.runPython("import sys; sys.path.insert(0, '/home/pyodide')");
      return py;
    })();
    pret.catch(() => { pret = null; }); // un échec réseau peut être retenté
  }
  return pret;
}

/** Positions et classement d'accord pour un jeu de réponses (-2 … +2, ou null). */
export async function calculer(reponses, calcul) {
  const py = await preparer();
  py.globals.set("entree", JSON.stringify({ reponses, ...calcul }));
  const sortie = py.runPython(`
import json
from questionnaire import classement, positionner

e = json.loads(entree)
positions = positionner(e["reponses"], e["items"], e["axes"])
accords = classement(e["reponses"], e["entites"], e["items"], e["axes"])
json.dumps({
    "positions": {axe: p.valeur for axe, p in positions.items()},
    "classement": [
        {"nom": a.nom, "pourcentage": a.pourcentage, "fiable": a.fiable,
         "desaccords": a.desaccords}
        for a in accords
    ],
})
`);
  return JSON.parse(sortie);
}
