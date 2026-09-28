// Politiscope : affichage des données construites par scripts/construire_site.py.
// Aucune position n'est calculée ici : celles des partis arrivent toutes faites
// dans donnees.json, celle du répondant vient de Pyodide (calcul.js).

import { calculer, preparer } from "./calcul.js";

const main = document.getElementById("contenu");
const bulle = document.getElementById("bulle");
let D; // donnees.json

// ------------------------------------------------------------------ utilitaires
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Nombre signé à la française : +1,5 ; −3,2 ; 0. */
function signe(v, decimales = 1) {
  if (v === 0) return "0";
  const t = Math.abs(v).toFixed(decimales).replace(".", ",").replace(/,0+$/, "");
  return (v > 0 ? "+" : "−") + t;
}

const stockage = {
  lire(cle, defaut, session = false) {
    try {
      const v = (session ? sessionStorage : localStorage).getItem(cle);
      return v === null ? defaut : JSON.parse(v);
    } catch { return defaut; }
  },
  ecrire(cle, valeur, session = false) {
    try { (session ? sessionStorage : localStorage).setItem(cle, JSON.stringify(valeur)); } catch { /* navigation privée */ }
  },
};

const sombre = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** Couleur d'un parti, éclaircie en mode sombre si elle s'y fond : un marqueur
 * noir ou bleu nuit sur fond sombre se lirait comme un marqueur creux. La teinte
 * est gardée, seule la clarté remonte. */
function teinte(couleur) {
  if (!sombre()) return couleur;
  let rgb = [1, 3, 5].map((i) => parseInt(couleur.slice(i, i + 2), 16));
  const lum = (c) => c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (let a = 0.1; lum(rgb) < 0.14 && a <= 0.6; a += 0.1) {
    rgb = [1, 3, 5].map((i, k) => { const v = parseInt(couleur.slice(i, i + 2), 16); return Math.round(v + (255 - v) * a); });
  }
  return `rgb(${rgb.join(",")})`;
}

/** Facteur d'agrandissement des textes et marqueurs de la carte : le SVG est
 * dessiné pour environ 700 px de large, et réduit d'autant sur un téléphone. */
const agrandissement = () => (innerWidth < 600 ? 2.1 : innerWidth < 900 ? 1.4 : 1);

/** Tracé SVG d'une forme de territoire, centrée en (x, y), demi-taille s. */
function trace(forme, x, y, s) {
  switch (forme) {
    case "square": return `<rect class="forme" x="${x - s * 0.88}" y="${y - s * 0.88}" width="${s * 1.76}" height="${s * 1.76}" rx="1.5"`;
    case "diamond": return `<path class="forme" d="M${x} ${y - s * 1.2}L${x + s * 1.2} ${y}L${x} ${y + s * 1.2}L${x - s * 1.2} ${y}Z"`;
    case "triangle-up": return `<path class="forme" d="M${x} ${y - s * 1.2}L${x + s * 1.1} ${y + s * 0.8}L${x - s * 1.1} ${y + s * 0.8}Z"`;
    default: return `<circle class="forme" cx="${x}" cy="${y}" r="${s}"`;
  }
}

function formePays(pays) { return D.pays.find((p) => p.nom === pays)?.forme ?? "circle"; }

/** Petite icône de territoire, en encre ou à la couleur d'un parti. */
function icone(pays, couleur = "currentColor") {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${trace(formePays(pays), 12, 12, 9)} fill="${couleur}" style="stroke:none"/></svg>`;
}

/** Couleur de case pour une note de -2 à +2 : divergente sarcelle / ocre. */
function styleCase(v) {
  const t = Math.min(Math.abs(v) / 2, 1);
  const pole = v < 0 ? "var(--pole-neg)" : "var(--pole-pos)";
  const fond = v === 0 ? "var(--neutre)" : `color-mix(in oklab, ${pole} ${Math.round(20 + t * 80)}%, var(--neutre))`;
  return `--case:${fond};${t >= 0.75 ? "--case-texte:#fff;" : ""}`;
}

const partiParId = (id) => D.partis.find((p) => p.id === id);
const partiParNom = (nom) => D.partis.find((p) => p.nom === nom);
const libelleIndicateur = (cle) => Object.values(D.axes).flatMap((a) => a.indicateurs).find((i) => i.cle === cle)?.libelle ?? cle;

// ------------------------------------------------------------------ infobulle
function montrerBulle(html, x, y) {
  bulle.innerHTML = html;
  bulle.hidden = false;
  const { width, height } = bulle.getBoundingClientRect();
  const gauche = Math.min(Math.max(8, x + 14), innerWidth - width - 8);
  const haut = y - height - 14 < 8 ? y + 18 : y - height - 14;
  bulle.style.left = `${gauche}px`;
  bulle.style.top = `${haut}px`;
}
const cacherBulle = () => { bulle.hidden = true; };

document.addEventListener("pointerover", (e) => {
  const cible = e.target.closest("[data-bulle]");
  if (cible) montrerBulle(cible.dataset.bulle, e.clientX, e.clientY);
});
document.addEventListener("pointermove", (e) => {
  if (!bulle.hidden && e.target.closest("[data-bulle]")) montrerBulle(bulle.innerHTML, e.clientX, e.clientY);
});
document.addEventListener("pointerout", (e) => {
  if (e.target.closest("[data-bulle]") && !e.relatedTarget?.closest?.("[data-bulle]")) cacherBulle();
});

// ------------------------------------------------------------------ filtre de territoires
function paysChoisis() {
  const tous = D.pays.map((p) => p.nom);
  const choix = stockage.lire("pays", tous).filter((p) => tous.includes(p));
  return choix.length ? choix : tous;
}

function filtreHTML() {
  const choisis = paysChoisis();
  return `<fieldset class="filtre"><legend>Territoires affichés</legend>${D.pays.map((p) => `
    <label class="puce"><input type="checkbox" value="${esc(p.nom)}" ${choisis.includes(p.nom) ? "checked" : ""}>${icone(p.nom)}${esc(p.nom)}</label>`).join("")}
  </fieldset>`;
}

function brancherFiltre(racine, apres) {
  racine.querySelector(".filtre").addEventListener("change", (e) => {
    const coches = [...racine.querySelectorAll(".filtre input:checked")].map((i) => i.value);
    if (!coches.length) { e.target.checked = true; return; } // jamais de carte vide
    stockage.ecrire("pays", coches);
    apres();
  });
}

// ------------------------------------------------------------------ carte
const BORNE = 11.6;
const TAILLE = 1000;
const X = (v) => ((v + BORNE) / (2 * BORNE)) * TAILLE;
const Y = (v) => ((BORNE - v) / (2 * BORNE)) * TAILLE;

const ANCRES = {
  "top center": [0, -26, "middle"], "bottom center": [0, 38, "middle"],
  "middle right": [22, 7, "start"], "middle left": [-22, 7, "end"],
  "top right": [16, -18, "start"], "top left": [-16, -18, "end"],
  "bottom right": [16, 30, "start"], "bottom left": [-16, 30, "end"],
};

function carteSVG({ partis, choisi = null, sigles = true, vous = null, titre = "Carte des partis", echelle = null }) {
  const [eco, soc] = [D.axes.economie, D.axes.societe];
  const f = echelle ?? agrandissement();
  const lignes = [];
  for (let v = -10; v <= 10; v++) {
    if (v === 0) continue;
    const cl = v % 5 === 0 ? "grille-forte" : "grille-fine";
    lignes.push(`<line class="${cl}" x1="${X(v)}" y1="${Y(10)}" x2="${X(v)}" y2="${Y(-10)}"/>`,
      `<line class="${cl}" x1="${X(-10)}" y1="${Y(v)}" x2="${X(10)}" y2="${Y(v)}"/>`);
  }
  const graduations = [-10, -5, 5, 10].map((v) => `
    <text class="graduation" x="${X(v)}" y="${Y(0) + 22 * f}" text-anchor="middle">${signe(v, 0)}</text>
    <text class="graduation" x="${X(0) - 10 * f}" y="${Y(v) + 5 * f}" text-anchor="end">${signe(v, 0)}</text>`).join("");

  const marques = partis.map((p) => {
    const x = X(p.positions.economie.valeur), y = Y(p.positions.societe.valeur);
    const mesuree = p.positions.economie.mesuree && p.positions.societe.mesuree;
    const [dx, dy, ancre] = (ANCRES[p.etiquette] ?? ANCRES["top center"]).map((v) => (typeof v === "number" ? v * f : v));
    const infos = `<b>${esc(p.nom)}</b>${p.chef ? `<br>${esc(p.chef)}` : ""}
      <div class="ligne"><span>${esc(eco.libelle)}</span><span>${signe(p.positions.economie.valeur)}</span></div>
      <div class="ligne"><span>${esc(soc.libelle)}</span><span>${signe(p.positions.societe.valeur)}</span></div>
      ${mesuree ? "" : "<div>Position estimée, pas encore mesurée</div>"}`;
    return `<g class="marque-parti${mesuree ? "" : " creux"}${p.id === choisi ? " choisi" : ""}" data-id="${p.id}" tabindex="0" role="button"
        aria-label="${esc(p.nom)}, ${esc(eco.libelle)} ${signe(p.positions.economie.valeur)}, ${esc(soc.libelle)} ${signe(p.positions.societe.valeur)}"
        data-bulle="${esc(infos)}">
      <circle class="cible" cx="${x}" cy="${y}" r="${24 * f}"/>
      <circle class="anneau" cx="${x}" cy="${y}" r="${20 * f}"/>
      ${trace(formePays(p.pays), x, y, 12 * f)} fill="${teinte(p.couleur)}" style="--c:${teinte(p.couleur)}"/>
      ${sigles ? `<text class="sigle" x="${x + dx}" y="${y + dy}" text-anchor="${ancre}">${esc(p.sigle)}</text>` : ""}
    </g>`;
  }).join("");

  const repere = vous ? (() => {
    const x = X(vous.economie), y = Y(vous.societe), g = f;
    return `<g class="vous" aria-label="Vous : ${eco.libelle} ${signe(vous.economie)}, ${soc.libelle} ${signe(vous.societe)}" role="img">
      <circle cx="${x}" cy="${y}" r="${15 * g}" fill="none" class="vous-trait"/>
      <line class="vous-trait" x1="${x - 24 * g}" y1="${y}" x2="${x + 24 * g}" y2="${y}"/>
      <line class="vous-trait" x1="${x}" y1="${y - 24 * g}" x2="${x}" y2="${y + 24 * g}"/>
      <text class="vous-texte" x="${x + 20 * g}" y="${y - 18 * g}">Vous</text></g>`;
  })() : "";

  return `<svg viewBox="0 0 ${TAILLE} ${TAILLE}" style="--f:${f}" role="group" aria-label="${esc(titre)}">
    <rect class="quadrant" x="${X(-10)}" y="${Y(10)}" width="${X(0) - X(-10)}" height="${Y(0) - Y(10)}"/>
    <rect class="quadrant" x="${X(0)}" y="${Y(0)}" width="${X(10) - X(0)}" height="${Y(-10) - Y(0)}"/>
    ${lignes.join("")}
    <line class="axe-trait" x1="${X(-BORNE)}" y1="${Y(0)}" x2="${X(BORNE)}" y2="${Y(0)}"/>
    <line class="axe-trait" x1="${X(0)}" y1="${Y(BORNE)}" x2="${X(0)}" y2="${Y(-BORNE)}"/>
    ${graduations}
    <text class="pole" x="${X(-BORNE) + 4}" y="${Y(0) - 12 * f}">${esc(eco.poles[0])}</text>
    <text class="pole" x="${X(BORNE) - 4}" y="${Y(0) - 12 * f}" text-anchor="end">${esc(eco.poles[1])}</text>
    <text class="pole" x="${X(0) + 12 * f}" y="${Y(BORNE) + 22 * f}">${esc(soc.poles[1])}</text>
    <text class="pole" x="${X(0) + 12 * f}" y="${Y(-BORNE) - 10 * f}">${esc(soc.poles[0])}</text>
    ${marques}${repere}
  </svg>`;
}

function legendeCarte(partis, vous) {
  const pays = D.pays.filter((p) => partis.some((x) => x.pays === p.nom));
  const creux = partis.some((p) => !(p.positions.economie.mesuree && p.positions.societe.mesuree));
  return `<div class="legende-carte">${pays.map((p) => `<span>${icone(p.nom)}${esc(p.nom)}</span>`).join("")}
    ${creux ? "<span>Marqueur creux : position estimée</span>" : ""}
    ${vous ? "<span>La croix : votre position</span>" : ""}</div>`;
}

function jauges(positions, couleur) {
  return `<div class="jauges" style="--couleur-parti:${couleur}">${Object.entries(D.axes).map(([axe, def]) => {
    const pos = positions[axe];
    const v = typeof pos === "number" ? pos : pos.valeur;
    return `<div>
      <div class="jauge-titre">${esc(def.libelle)}</div>
      <div class="jauge-valeur">${signe(v)}</div>
      <div class="jauge-regle" role="img" aria-label="${signe(v)} sur une échelle de −10 (${esc(def.poles[0])}) à +10 (${esc(def.poles[1])})"><i style="left:${(v + 10) * 5}%"></i></div>
      <div class="jauge-poles"><span>${esc(def.poles[0])}</span><span>${esc(def.poles[1])}</span></div>
      ${pos.mesuree === false ? '<div class="jauge-note">Position estimée, pas encore mesurée</div>' : ""}
    </div>`;
  }).join("")}</div>`;
}

function sourcesHTML(cles) {
  const refs = (cles || []).map((c) => D.sources[c]).filter(Boolean);
  if (!refs.length) return "";
  return `<div class="sources-titre">Sources</div><ul class="sources">${refs.map((s) => `
    <li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>
      ${s.auteur ? `<span class="auteur">${esc(s.auteur)}</span>` : ""}
      ${s.acces ? `<span class="acces">${esc(s.acces)}</span>` : ""}</li>`).join("")}</ul>`;
}

function indicateursHTML(p, axe) {
  return D.axes[axe].indicateurs.map(({ cle, libelle }) => {
    const b = p.indicateurs[cle];
    if (!b || (b.valeur == null && !b.absent)) {
      return `<div class="non-recherche"><span>${esc(libelle)}</span><span>Pas encore recherché</span></div>`;
    }
    const puce = b.valeur == null
      ? '<span class="note absent">Sans position</span>'
      : `<span class="note" style="${styleCase(b.valeur)}">${signe(b.valeur)}</span>`;
    return `<details class="indicateur">
      <summary><span class="indicateur-nom">${esc(libelle)}</span>${b.contest ? '<span class="discutable" title="Score discutable"></span>' : ""}${puce}</summary>
      <div class="indicateur-corps prose">
        ${b.contest ? `<div class="contestation"><strong>Score discutable.</strong> ${b.contest}</div>` : ""}
        ${b.just}
        ${sourcesHTML(b.src)}
      </div>
    </details>`;
  }).join("");
}

function ficheHTML(p) {
  const volets = [...Object.entries(D.axes).map(([axe, d]) => [axe, d.libelle]), ["hors", "Hors axes"]];
  const attributs = [["Souveraineté", p.souverainete], ["Écologie", p.ecologie]].filter(([, v]) => v);
  return `<article class="fiche" aria-labelledby="fiche-titre">
    <header class="fiche-tete" style="--couleur-parti:${teinte(p.couleur)}">
      <span class="fiche-pays">${icone(p.pays)}${esc(p.pays)}</span>
      <h2 id="fiche-titre">${esc(p.nom)}</h2>
      ${p.chef ? `<p class="fiche-chef">${esc(p.chef)}</p>` : ""}
      <button class="fiche-fermer" type="button" aria-label="Fermer la fiche"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </header>
    ${jauges(p.positions, teinte(p.couleur))}
    ${attributs.length ? `<dl class="attributs">${attributs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    <div class="resume prose">${p.resume}</div>
    <div class="volets">
      <div class="volets-choix" role="tablist">${volets.map(([k, l], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-volet="${k}">${esc(l)}</button>`).join("")}</div>
      ${volets.map(([k], i) => `<div role="tabpanel" data-panneau="${k}" ${i ? "hidden" : ""}>${k === "hors" ? `
        <div class="prose">${p.autorite ? `<h3>Rapport à l'autorité</h3>${p.autorite}` : ""}
        ${p.resume_src.length ? `<h3>Sources du résumé</h3>${sourcesHTML(p.resume_src)}` : ""}</div>` : indicateursHTML(p, k)}</div>`).join("")}
    </div>
  </article>`;
}

function brancherFiche(racine) {
  racine.querySelector(".fiche-fermer")?.addEventListener("click", () => { location.hash = "#/carte"; });
  racine.querySelectorAll("[data-volet]").forEach((b) => b.addEventListener("click", () => {
    racine.querySelectorAll("[data-volet]").forEach((x) => x.setAttribute("aria-selected", x === b));
    racine.querySelectorAll("[data-panneau]").forEach((x) => { x.hidden = x.dataset.panneau !== b.dataset.volet; });
  }));
}

function pageCarte(idChoisi) {
  const vous = stockage.lire("repondant", null, true);
  const rendre = () => {
    const pays = paysChoisis();
    const partis = D.partis.filter((p) => pays.includes(p.pays));
    const choisi = partis.find((p) => p.id === idChoisi) ?? null;
    const sigles = stockage.lire("sigles", true);
    main.innerHTML = `
      <h1>Un même compas pour quatre territoires</h1>
      <p class="chapeau">États-Unis, Canada, Québec et France : chaque parti est placé d'après ses programmes, ses votes et les mesures qu'il a prises, note par note, chacune sourcée. Cliquez sur un point pour ouvrir sa fiche.</p>
      <div class="barre">${filtreHTML()}
        <label class="interrupteur"><input type="checkbox" id="sigles" ${sigles ? "checked" : ""}>Sigles</label></div>
      <div class="planche">
        <div class="releve${choisi ? " focalise" : ""}">${carteSVG({ partis, choisi: choisi?.id, sigles, vous })}${legendeCarte(partis, vous)}</div>
        <div class="colonne-fiche">${choisi ? ficheHTML(choisi) : `
          <div class="fiche fiche-vide">
            <h2>Choisir un parti</h2>
            <p>Chaque fiche détaille les notes qui fondent la position du parti, avec leurs justifications et leurs sources.</p>
            <label for="choix-parti" class="jauge-titre">Parti</label>
            <select id="choix-parti"><option value="">Choisir…</option>${D.pays.map((pa) => `<optgroup label="${esc(pa.nom)}">${partis.filter((p) => p.pays === pa.nom).map((p) => `<option value="${p.id}">${esc(p.nom)}</option>`).join("")}</optgroup>`).join("")}</select>
            ${vous ? "" : `<p>Où vous situez-vous parmi eux ? Une affirmation par thème, et vos réponses restent dans votre navigateur.</p><a class="bouton" href="#/questionnaire">Me situer sur la carte</a>`}
          </div>`}</div>
      </div>`;
    brancherFiltre(main, rendre);
    main.querySelector("#sigles").addEventListener("change", (e) => { stockage.ecrire("sigles", e.target.checked); rendre(); });
    main.querySelector("#choix-parti")?.addEventListener("change", (e) => { if (e.target.value) location.hash = `#/carte/${e.target.value}`; });
    main.querySelectorAll(".marque-parti").forEach((g) => {
      const ouvrir = () => { cacherBulle(); location.hash = g.dataset.id === idChoisi ? "#/carte" : `#/carte/${g.dataset.id}`; };
      g.addEventListener("click", ouvrir);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } });
    });
    if (choisi) brancherFiche(main);
  };
  rendre();
}

// ------------------------------------------------------------------ questionnaire
const ECHELLE = [2, 1, 0, -1, -2];

function pageQuestionnaire() {
  preparer(); // Python se télécharge pendant que le visiteur répond
  const q = D.questionnaire;
  const reponses = stockage.lire("reponses", {}, true);
  const exemples = stockage.lire("exemples", "Québec");
  const axeDe = Object.fromEntries(Object.entries(D.axes).flatMap(([a, d]) => d.indicateurs.map((i) => [i.cle, a])));
  let n = 0;

  main.innerHTML = `<div class="questionnaire">
    <h1>Où vous situez-vous ?</h1>
    <p class="chapeau">Donnez votre avis sur une affirmation par thème. Vous serez placé sur la carte par le même calcul que les partis, et comparé à chacun, thème par thème.</p>
    <details class="a-propos"><summary>Comment c'est calculé</summary><div class="prose">
      <p>Vous répondez à <strong>une</strong> affirmation par thème ; les partis ont été notés sur leurs programmes, leurs votes et leurs mesures. On compare donc le sens et la force d'une préférence, pas une équivalence exacte.</p>
      ${q.sans_opinion}
      <p>Le calcul s'exécute dans votre navigateur : vos réponses ne sont envoyées nulle part.</p></div></details>
    <div class="exemples-choix"><span>Exemples tirés de</span>
      <select id="exemples">${D.pays.map((p) => `<option ${p.nom === exemples ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select></div>
    <form id="formulaire">
      ${Object.entries(D.axes).map(([axe, def]) => `<section class="bloc-axe"><h2>${esc(def.libelle)}</h2>
        ${q.items.filter((it) => axeDe[it.indicateur] === axe).map((it) => {
          n += 1;
          const r = reponses[it.indicateur];
          return `<div class="question">
            <p class="question-enonce" id="enonce-${it.indicateur}"><span class="question-num">${n}</span>${it.enonce}</p>
            <p class="question-exemple" data-exemples='${esc(JSON.stringify(it.exemples))}'>${it.exemples[exemples] ?? ""}</p>
            <fieldset class="echelle"><legend>Réponse à l'affirmation ${n}</legend>
              ${ECHELLE.map((v) => `<label><input type="radio" name="${it.indicateur}" value="${v}" ${r === v ? "checked" : ""}>${esc(q.echelle[v])}</label>`).join("")}
              <label class="sans-avis"><input type="radio" name="${it.indicateur}" value="" ${r === undefined || r === null ? "checked" : ""}>Sans opinion</label>
            </fieldset></div>`;
        }).join("")}</section>`).join("")}
      <div class="envoi"><button class="bouton" type="submit" id="envoyer">Voir mon résultat</button>
        <p id="etat-calcul" aria-live="polite"></p></div>
    </form>
    <div id="resultat"></div></div>`;

  main.querySelector("#exemples").addEventListener("change", (e) => {
    stockage.ecrire("exemples", e.target.value);
    main.querySelectorAll("[data-exemples]").forEach((el) => { el.innerHTML = JSON.parse(el.dataset.exemples)[e.target.value] ?? ""; });
  });

  const form = main.querySelector("#formulaire");
  const lire = () => Object.fromEntries(q.items.map((it) => {
    const v = form.elements[it.indicateur].value;
    return [it.indicateur, v === "" ? null : Number(v)];
  }));
  form.addEventListener("change", () => stockage.ecrire("reponses", lire(), true));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bouton = main.querySelector("#envoyer");
    const etat = main.querySelector("#etat-calcul");
    bouton.disabled = true;
    etat.textContent = "Calcul en cours…";
    const r = lire();
    stockage.ecrire("reponses", r, true);
    let res;
    try {
      res = await calculer(r, D.calcul);
    } catch (err) {
      console.error(err);
      etat.textContent = "Le module de calcul n'a pas pu se charger. Vérifiez la connexion, puis relancez.";
      bouton.disabled = false;
      return;
    }
    etat.textContent = "";
    bouton.disabled = false;
    afficherResultat(res);
  });

  if (stockage.lire("resultat", null, true)) afficherResultat(stockage.lire("resultat", null, true), false);
}

function afficherResultat(res, defiler = true) {
  const zone = main.querySelector("#resultat");
  const axes = Object.keys(D.axes);
  if (axes.some((a) => res.positions[a] == null)) {
    zone.innerHTML = `<section class="resultat"><p class="avertissement">Trop de réponses « Sans opinion » pour vous placer sur les deux axes. Il faut au moins quatre avis par thème.</p></section>`;
    stockage.ecrire("repondant", null, true);
    if (defiler) zone.firstElementChild.scrollIntoView({ behavior: "smooth" });
    return;
  }
  stockage.ecrire("resultat", res, true);
  stockage.ecrire("repondant", res.positions, true);
  const vous = res.positions;
  const premier = res.classement[0];
  // Le point le plus proche sur la carte n'est pas forcément le premier du
  // classement : les axes résument les réponses, le classement les compare une à une.
  const voisin = [...D.partis].sort((a, b) =>
    Math.hypot(a.positions.economie.valeur - vous.economie, a.positions.societe.valeur - vous.societe)
    - Math.hypot(b.positions.economie.valeur - vous.economie, b.positions.societe.valeur - vous.societe))[0];

  zone.innerHTML = `<section class="resultat" tabindex="-1">
    <h2>Votre résultat</h2>
    <div class="resultat-grille">
      <div>
        ${jauges(vous, "var(--encre)")}
        <div class="releve">${carteSVG({ partis: D.partis, sigles: false, vous, titre: "Votre position parmi les partis", echelle: innerWidth < 600 ? 2.1 : 1.7 })}</div>
        <a class="bouton discret" href="#/carte">Me voir sur la carte</a>
      </div>
      <div>
        <h3>Vos accords, parti par parti</h3>
        <ol class="classement">${res.classement.map((a) => {
          const p = partiParNom(a.nom);
          return `<li>${icone(p.pays, teinte(p.couleur))}
            <span class="nom"><a href="#/carte/${p.id}">${esc(p.nom)}</a><small>${esc(p.pays)}</small></span>
            <span class="pct">${Math.round(a.pourcentage)} %</span>
            <span class="barre-accord"><i style="width:${a.pourcentage}%"></i></span>
            ${a.fiable ? "" : '<span class="fragile">Peu fiable : trop peu de thèmes en commun</span>'}</li>`;
        }).join("")}</ol>
        ${premier && voisin.nom !== premier.nom ? `<p class="note-carte">Sur la carte, votre plus proche voisin est ${esc(voisin.nom)}. La carte résume vos réponses en deux chiffres ; le classement, lui, les compare une à une.</p>` : ""}
        ${premier?.desaccords.length ? `<details class="desaccords"><summary>Vos désaccords avec ${esc(premier.nom)}</summary><ul>
          ${premier.desaccords.map(([cle, v, p]) => `<li><strong>${esc(libelleIndicateur(cle))}</strong> : vous ${signe(v)}, ${esc(premier.nom)} ${signe(p)}</li>`).join("")}</ul></details>` : ""}
      </div>
    </div></section>`;
  if (defiler) zone.firstElementChild.focus({ preventScroll: true }), zone.firstElementChild.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

// ------------------------------------------------------------------ comparer
function pageComparer(volet = "indicateurs") {
  const rendre = () => {
    const pays = paysChoisis();
    const partis = pays.flatMap((pa) => D.partis.filter((p) => p.pays === pa)
      .sort((a, b) => a.positions.economie.valeur - b.positions.economie.valeur));
    const axes = Object.values(D.axes);
    const nbCols = axes.reduce((n, a) => n + a.indicateurs.length, 0);

    const matrice = `<div class="defile"><table class="matrice">
      <thead>
        <tr class="groupe"><th></th>${axes.map((a) => `<th colspan="${a.indicateurs.length}">${esc(a.libelle)}</th>`).join("")}</tr>
        <tr class="entete-ind"><th></th>${axes.map((a) => a.indicateurs.map((i) => `<th scope="col"><div>${esc(i.libelle)}</div></th>`).join("")).join("")}</tr>
      </thead>
      <tbody>${pays.map((pa) => `<tr class="pays"><th colspan="${nbCols + 1}">${icone(pa)} ${esc(pa)}</th></tr>
        ${partis.filter((p) => p.pays === pa).map((p) => `<tr><th scope="row"><a href="#/carte/${p.id}">${icone(p.pays, teinte(p.couleur))}${esc(p.nom)}</a></th>
          ${axes.map((a) => a.indicateurs.map((ind, k) => {
            const b = p.indicateurs[ind.cle];
            const debut = k === 0 ? ' class="debut-axe"' : "";
            const info = (t) => `data-bulle="${esc(`<b>${esc(p.nom)}</b><br>${esc(ind.libelle)} : ${t}`)}"`;
            if (b?.valeur != null) return `<td${debut}><span style="${styleCase(b.valeur)}" ${info(signe(b.valeur))}>${signe(b.valeur)}</span></td>`;
            if (b?.absent) return `<td${debut}><span class="absent" ${info("sans position, recherche faite")}>∅</span></td>`;
            return `<td${debut}><span class="vide" ${info("pas encore recherché")}>?</span></td>`;
          }).join("")).join("")}</tr>`).join("")}`).join("")}
      </tbody></table></div>
      <div class="legende-matrice">
        <span class="degrade">−2 <i></i> +2</span>
        <span>${axes.map((a) => `${esc(a.libelle)} : de ${esc(a.poles[0].toLowerCase())} à ${esc(a.poles[1].toLowerCase())}`).join(". ")}.</span>
        <span>∅ le parti ne se prononce pas</span><span>? pas encore recherché</span>
      </div>`;

    const positions = `<div class="defile"><table class="positions">
      <thead><tr><th>Parti</th><th>Chef</th><th>Territoire</th>${axes.map((a) => `<th class="nombre">${esc(a.libelle)}</th>`).join("")}</tr></thead>
      <tbody>${partis.map((p) => `<tr><td><a href="#/carte/${p.id}">${icone(p.pays, teinte(p.couleur))}${esc(p.nom)}</a></td><td>${esc(p.chef ?? "")}</td><td>${esc(p.pays)}</td>
        ${Object.keys(D.axes).map((a) => `<td class="nombre">${signe(p.positions[a].valeur)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

    main.innerHTML = `<h1>Comparer les partis</h1>
      <p class="chapeau">Les notes de chaque parti, thème par thème, de −2 à +2.</p>
      <div class="barre">${filtreHTML()}</div>
      <div class="volets-page" role="tablist">
        <button type="button" role="tab" data-v="indicateurs" aria-selected="${volet === "indicateurs"}">Notes par thème</button>
        <button type="button" role="tab" data-v="positions" aria-selected="${volet === "positions"}">Positions</button></div>
      ${volet === "indicateurs" ? matrice : positions}`;
    brancherFiltre(main, rendre);
    main.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => { volet = b.dataset.v; rendre(); }));
  };
  rendre();
}

// ------------------------------------------------------------------ méthode
function pageMethode() {
  main.innerHTML = `<article class="methode prose">${D.grille}</article>`;
}

// ------------------------------------------------------------------ navigation
function router() {
  cacherBulle();
  const [, page = "carte", arg] = location.hash.split("/");
  document.querySelectorAll(".onglets a").forEach((a) => {
    if (a.dataset.page === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const titres = { carte: "Carte", questionnaire: "Me situer", comparer: "Comparer", methode: "Méthode" };
  const parti = page === "carte" && arg ? partiParId(arg) : null;
  document.title = parti ? `${parti.nom} · Politiscope` : page === "carte" ? "Politiscope" : `${titres[page] ?? ""} · Politiscope`;
  const pages = { carte: () => pageCarte(arg), questionnaire: pageQuestionnaire, comparer: () => pageComparer(), methode: pageMethode };
  (pages[page] ?? pages.carte)();
  if (!(page === "carte" && arg)) scrollTo(0, 0);
}

async function demarrer() {
  try {
    D = await (await fetch("donnees.json")).json();
  } catch {
    main.innerHTML = '<p class="chargement">Les données n\'ont pas pu être chargées. Rechargez la page.</p>';
    return;
  }
  if (D.meta.mise_a_jour) document.getElementById("date-donnees").textContent = `. Données au ${D.meta.mise_a_jour}`;
  addEventListener("hashchange", router);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", router);
  let palier = agrandissement();
  addEventListener("resize", () => { if (agrandissement() !== palier) { palier = agrandissement(); router(); } });
  router();
}

demarrer();
