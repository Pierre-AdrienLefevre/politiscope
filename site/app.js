// Politiscope : affichage des données construites par scripts/construire_site.py.
// Aucune position n'est calculée ici : celles des partis arrivent toutes faites
// dans donnees.json, celle du répondant vient de Pyodide (calcul.js).

import { calculer, preparer } from "./calcul.js";

const main = document.getElementById("contenu");
const bulle = document.getElementById("bulle");
let D; // donnees.json

// Élection générale du Québec : le bandeau affiche le compte à rebours jusqu'au
// jour du vote, puis disparaît.
const ELECTION_QUEBEC = new Date("2026-10-05T00:00:00-04:00");

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
const sansMouvement = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (c) => c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);

/** Couleur d'un parti, éclaircie en mode sombre si elle s'y fond : un marqueur
 * noir ou bleu nuit sur fond sombre se lirait comme un marqueur creux. La teinte
 * est gardée, seule la clarté remonte. */
function teinte(couleur) {
  if (!sombre()) return couleur;
  const base = rgb(couleur);
  let c = base;
  for (let a = 0.1; luminance(c) < 0.14 && a <= 0.6; a += 0.1) c = base.map((v) => Math.round(v + (255 - v) * a));
  return `rgb(${c.join(",")})`;
}

/** Encre lisible sur un aplat de la couleur du parti. */
const encreSur = (couleur) => {
  const l = luminance(rgb(couleur));
  return (l + 0.05) / (luminance(rgb("#121129")) + 0.05) > 1.05 / (l + 0.05) ? "#121129" : "#ffffff";
};

/** Facteur d'agrandissement des textes et marqueurs de la carte : le SVG est
 * dessiné pour environ 700 px de large, et réduit d'autant sur un téléphone. */
const agrandissement = () => (innerWidth < 600 ? 1.75 : innerWidth < 1000 ? 1.3 : 1);

/** Tracé SVG d'une forme de territoire, centrée en (x, y), demi-taille s. */
function trace(forme, x, y, s) {
  switch (forme) {
    case "square": return `<rect class="forme" x="${x - s * 0.88}" y="${y - s * 0.88}" width="${s * 1.76}" height="${s * 1.76}" rx="${s * 0.2}"`;
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

const ICONES = {
  fermer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  retour: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  suite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  coche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
};

/** Couleur de case pour une note de -2 à +2 : divergente sarcelle / ocre. */
function styleCase(v) {
  const t = Math.min(Math.abs(v) / 2, 1);
  const pole = v < 0 ? "var(--pole-neg)" : "var(--pole-pos)";
  const fond = v === 0 ? "var(--neutre)" : `color-mix(in oklab, ${pole} ${Math.round(20 + t * 80)}%, var(--neutre))`;
  return `--case:${fond};${t >= 0.75 ? "--case-texte:#fff;" : ""}`;
}

const partiParId = (id) => D.partis.find((p) => p.id === id);
const partiParNom = (nom) => D.partis.find((p) => p.nom === nom);
const indicateurs = () => Object.values(D.axes).flatMap((a) => a.indicateurs);
const libelleIndicateur = (cle) => indicateurs().find((i) => i.cle === cle)?.libelle ?? cle;

// ------------------------------------------------------------------ infobulle
function montrerBulle(html, x, y) {
  bulle.innerHTML = html;
  bulle.hidden = false;
  const { width, height } = bulle.getBoundingClientRect();
  bulle.style.left = `${Math.min(Math.max(8, x + 14), innerWidth - width - 8)}px`;
  bulle.style.top = `${y - height - 14 < 8 ? y + 18 : y - height - 14}px`;
}
const cacherBulle = () => { bulle.hidden = true; };

document.addEventListener("pointerover", (e) => {
  const cible = e.target.closest("[data-bulle]");
  if (cible && e.pointerType !== "touch") montrerBulle(cible.dataset.bulle, e.clientX, e.clientY);
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

/** Étiquette de pôle : pastille indigo au bout d'un axe. */
function etiquettePole(texte, x, y, ancre, f) {
  const taille = 17 * f, largeur = texte.length * taille * 0.55 + 20 * f, hauteur = taille * 1.7;
  const gauche = ancre === "end" ? x - largeur : ancre === "middle" ? x - largeur / 2 : x;
  return `<rect class="pole-fond" x="${gauche}" y="${y - hauteur / 2}" width="${largeur}" height="${hauteur}" rx="${hauteur / 2}"/>
    <text class="pole" x="${gauche + largeur / 2}" y="${y + taille * 0.36}" text-anchor="middle">${esc(texte)}</text>`;
}

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
    <text class="graduation" x="${X(v)}" y="${Y(0) + 24 * f}" text-anchor="middle">${signe(v, 0)}</text>
    <text class="graduation" x="${X(0) - 10 * f}" y="${Y(v) + 5 * f}" text-anchor="end">${signe(v, 0)}</text>`).join("");

  const marques = partis.map((p) => {
    const x = X(p.positions.economie.valeur), y = Y(p.positions.societe.valeur);
    const mesuree = p.positions.economie.mesuree && p.positions.societe.mesuree;
    let [dx, dy, ancre] = (ANCRES[p.etiquette] ?? ANCRES["top center"]).map((v) => (typeof v === "number" ? v * f : v));
    // Un sigle qui sortirait du cadre est retourné vers l'intérieur.
    const largeur = p.sigle.length * 18 * f * 0.5;
    if (ancre === "start" && x + dx + largeur > TAILLE - 8) { ancre = "end"; dx = -Math.abs(dx); }
    else if (ancre === "end" && x + dx - largeur < 8) { ancre = "start"; dx = Math.abs(dx); }
    else if (ancre === "middle" && x - largeur / 2 < 8) { ancre = "start"; dx = -10 * f; }
    else if (ancre === "middle" && x + largeur / 2 > TAILLE - 8) { ancre = "end"; dx = 10 * f; }
    const c = teinte(p.couleur);
    const infos = `<b>${esc(p.nom)}</b>${p.chef ? `<br>${esc(p.chef)}` : ""}
      <div class="ligne"><span>${esc(eco.libelle)}</span><span>${signe(p.positions.economie.valeur)}</span></div>
      <div class="ligne"><span>${esc(soc.libelle)}</span><span>${signe(p.positions.societe.valeur)}</span></div>
      ${mesuree ? "" : "<div>Position estimée, pas encore mesurée</div>"}`;
    return `<g class="marque-parti${mesuree ? "" : " creux"}${p.id === choisi ? " choisi" : ""}" data-id="${p.id}" tabindex="0" role="button"
        style="--c:${c}" aria-label="${esc(p.nom)}, ${esc(eco.libelle)} ${signe(p.positions.economie.valeur)}, ${esc(soc.libelle)} ${signe(p.positions.societe.valeur)}"
        data-bulle="${esc(infos)}">
      <circle class="cible" cx="${x}" cy="${y}" r="${24 * f}"/>
      <circle class="anneau" cx="${x}" cy="${y}" r="${16 * f}"/>
      ${trace(formePays(p.pays), x, y, 12 * f)} fill="${c}"/>
      ${sigles ? `<text class="sigle" x="${x + dx}" y="${y + dy}" text-anchor="${ancre}">${esc(p.sigle)}</text>` : ""}
    </g>`;
  }).join("");

  const repere = vous ? (() => {
    const x = X(vous.economie), y = Y(vous.societe), g = f;
    return `<g role="img" aria-label="Vous : ${esc(eco.libelle)} ${signe(vous.economie)}, ${esc(soc.libelle)} ${signe(vous.societe)}">
      <circle cx="${x}" cy="${y}" r="${14 * g}" fill="none" class="vous-trait"/>
      <line class="vous-trait" x1="${x - 22 * g}" y1="${y}" x2="${x + 22 * g}" y2="${y}"/>
      <line class="vous-trait" x1="${x}" y1="${y - 22 * g}" x2="${x}" y2="${y + 22 * g}"/>
      <rect class="vous-fond" x="${x + 16 * g}" y="${y - 44 * g}" width="${50 * g}" height="${24 * g}" rx="${12 * g}"/>
      <text class="vous-texte" x="${x + 41 * g}" y="${y - 27 * g}" text-anchor="middle">Vous</text></g>`;
  })() : "";

  return `<svg viewBox="0 0 ${TAILLE} ${TAILLE}" style="--f:${f}" role="group" aria-label="${esc(titre)}">
    <rect class="cadre" x="0" y="0" width="${TAILLE}" height="${TAILLE}" rx="24"/>
    ${lignes.join("")}
    <line class="axe-trait" x1="${X(-10.8)}" y1="${Y(0)}" x2="${X(10.8)}" y2="${Y(0)}"/>
    <line class="axe-trait" x1="${X(0)}" y1="${Y(10.8)}" x2="${X(0)}" y2="${Y(-10.8)}"/>
    ${graduations}
    ${etiquettePole(eco.poles[0], X(-BORNE) + 10, Y(0), "start", f)}
    ${etiquettePole(eco.poles[1], X(BORNE) - 10, Y(0), "end", f)}
    ${etiquettePole(soc.poles[1], X(0) - 14 * f, Y(BORNE) + 26 * f, "end", f)}
    ${etiquettePole(soc.poles[0], X(0) - 14 * f, Y(-BORNE) - 26 * f, "end", f)}
    ${marques}${repere}
  </svg>`;
}

function legendeCarte(partis, vous) {
  const pays = D.pays.filter((p) => partis.some((x) => x.pays === p.nom));
  const creux = partis.some((p) => !(p.positions.economie.mesuree && p.positions.societe.mesuree));
  return `<div class="legende-carte">${pays.map((p) => `<span>${icone(p.nom)}${esc(p.nom)}</span>`).join("")}
    ${creux ? "<span>Marqueur creux : position estimée</span>" : ""}
    ${vous ? "<span>Violet : votre position</span>" : ""}</div>`;
}

/** Sous le titre « Économie », « Gauche économique » se lit « Gauche ». */
const court = (pole) => pole.replace(/ économique$/, "");

/** Les deux positions en grands chiffres, avec leur règle de −10 à +10. */
function scoresHTML(positions, point) {
  return `<div class="scores">${Object.entries(D.axes).map(([axe, def]) => {
    const pos = positions[axe];
    const v = typeof pos === "number" ? pos : pos.valeur;
    return `<div class="score">
      <div class="score-titre">${esc(def.libelle)}</div>
      <div class="score-valeur">${signe(v)}</div>
      <div class="regle" role="img" aria-label="${signe(v)} sur une échelle de −10 (${esc(def.poles[0])}) à +10 (${esc(def.poles[1])})"><i style="left:${(v + 10) * 5}%;--point:${point}"></i></div>
      <div class="poles">${def.poles.map((pole) => `<span>${esc(court(pole))}</span>`).join("")}</div>
      ${pos.mesuree === false ? '<div class="score-note">Position estimée, pas encore mesurée</div>' : ""}
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
      <summary><span class="indicateur-nom">${esc(libelle)}</span>${b.contest ? '<span class="discutable">Discutable</span>' : ""}${puce}</summary>
      <div class="indicateur-corps prose">
        ${b.contest ? `<div class="contestation"><span class="etiquette">Score discutable</span>${b.contest}</div>` : ""}
        ${b.just}
        ${sourcesHTML(b.src)}
      </div>
    </details>`;
  }).join("");
}

function ficheHTML(p) {
  const c = teinte(p.couleur);
  const volets = [...Object.entries(D.axes).map(([axe, d]) => [axe, d.libelle]), ["hors", "Hors axes"]];
  const attributs = [["Souveraineté", p.souverainete], ["Écologie", p.ecologie]].filter(([, v]) => v);
  return `<article class="fiche" aria-labelledby="fiche-titre">
    <header class="plaque" style="--couleur-parti:${c};--sur-parti:${encreSur(p.couleur)}">
      <span class="pays">${icone(p.pays)}${esc(p.pays)}</span>
      <h2 id="fiche-titre">${esc(p.nom)}</h2>
      ${p.chef ? `<p class="chef">${esc(p.chef)}</p>` : ""}
      <button class="fermer" type="button" aria-label="Fermer la fiche">${ICONES.fermer}</button>
    </header>
    ${scoresHTML(p.positions, c)}
    <div class="fiche-corps">
      ${attributs.length ? `<dl class="attributs">${attributs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      <div class="prose">${p.resume}</div>
      <div class="volets-choix" role="tablist">${volets.map(([k, l], i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-volet="${k}">${esc(l)}</button>`).join("")}</div>
      ${volets.map(([k], i) => `<div role="tabpanel" data-panneau="${k}" ${i ? "hidden" : ""}>${k === "hors" ? `
        <div class="prose">${p.autorite ? `<h3>Rapport à l'autorité</h3>${p.autorite}` : ""}
        ${p.resume_src.length ? `<h3>Sources du résumé</h3>${sourcesHTML(p.resume_src)}` : ""}</div>` : indicateursHTML(p, k)}</div>`).join("")}
    </div>
  </article>`;
}

function brancherFiche(racine) {
  racine.querySelector(".fermer")?.addEventListener("click", () => { location.hash = "#/carte"; });
  racine.querySelectorAll("[data-volet]").forEach((b) => b.addEventListener("click", () => {
    racine.querySelectorAll("[data-volet]").forEach((x) => x.setAttribute("aria-selected", x === b));
    racine.querySelectorAll("[data-panneau]").forEach((x) => { x.hidden = x.dataset.panneau !== b.dataset.volet; });
  }));
}

function pageCarte(idChoisi) {
  const vous = stockage.lire("repondant", null, true);
  const rendre = (defiler = false) => {
    const pays = paysChoisis();
    const partis = D.partis.filter((p) => pays.includes(p.pays));
    const choisi = partis.find((p) => p.id === idChoisi) ?? null;
    const sigles = stockage.lire("sigles", true);
    main.innerHTML = `<div class="plateau">
      <section class="grand-ecran" aria-label="Carte des partis">
        <div class="outils">${filtreHTML()}
          <label class="interrupteur"><input type="checkbox" id="sigles" ${sigles ? "checked" : ""}>Sigles</label></div>
        <div class="releve${choisi ? " focalise" : ""}">${carteSVG({ partis, choisi: choisi?.id, sigles, vous })}${legendeCarte(partis, vous)}</div>
      </section>
      <aside class="regie">${choisi ? ficheHTML(choisi) : `
        <div class="regie-accueil">
          <h1>Où se placent les partis ?</h1>
          <p class="intro">États-Unis, Canada, Québec et France sur une même règle. Chaque parti est placé d'après ses programmes, ses votes et les mesures qu'il a prises, note par note, chacune sourcée.</p>
          <a class="bouton" href="#/questionnaire">${vous ? "Revoir mon résultat" : "Me situer parmi eux"}</a>
          <div class="choix"><label for="choix-parti">Ouvrir la fiche d'un parti</label>
            <select id="choix-parti"><option value="">Choisir un parti</option>${D.pays.map((pa) => `<optgroup label="${esc(pa.nom)}">${partis.filter((p) => p.pays === pa.nom).map((p) => `<option value="${p.id}">${esc(p.nom)}</option>`).join("")}</optgroup>`).join("")}</select></div>
          <p class="echeance">Touchez un point de la carte pour ouvrir sa fiche : les notes, leurs justifications et leurs sources.</p>
        </div>`}</aside>
    </div>`;
    brancherFiltre(main, () => rendre());
    main.querySelector("#sigles").addEventListener("change", (e) => { stockage.ecrire("sigles", e.target.checked); rendre(); });
    main.querySelector("#choix-parti")?.addEventListener("change", (e) => { if (e.target.value) location.hash = `#/carte/${e.target.value}`; });
    main.querySelectorAll(".marque-parti").forEach((g) => {
      const ouvrir = () => { cacherBulle(); location.hash = g.dataset.id === idChoisi ? "#/carte" : `#/carte/${g.dataset.id}`; };
      g.addEventListener("click", ouvrir);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrir(); } });
    });
    if (choisi) {
      brancherFiche(main);
      // Sur téléphone, la fiche est sous la carte : on l'amène à l'écran.
      if (defiler && innerWidth < 1000) main.querySelector(".fiche").scrollIntoView({ behavior: sansMouvement() ? "auto" : "smooth" });
    }
  };
  rendre(true);
}

// ------------------------------------------------------------------ questionnaire
const ECHELLE = [2, 1, 0, -1, -2];
const JALONS = { 2: [22, true], 1: [14, true], 0: [10, false], "-1": [14, false], "-2": [22, false] };

function ordreQuestions() {
  // Les affirmations suivent l'ordre des axes et des indicateurs de la grille.
  const rang = Object.fromEntries(indicateurs().map((i, k) => [i.cle, k]));
  return [...D.questionnaire.items].sort((a, b) => rang[a.indicateur] - rang[b.indicateur]);
}

function pageQuestionnaire() {
  preparer(); // Python se télécharge pendant que le visiteur lit et répond
  const etape = stockage.lire("etape", "intro", true);
  if (etape === "resultat" && stockage.lire("resultat", null, true)) return afficherDepouillement(stockage.lire("resultat", null, true), false);
  if (typeof etape === "number") return afficherQuestion(etape);
  afficherIntro();
}

function afficherIntro() {
  const q = D.questionnaire;
  main.innerHTML = `<div class="scene"><div class="carton">
    <h1>Où vous situez-vous ?</h1>
    <p class="intro">Donnez votre avis sur une affirmation par thème. Vous serez placé sur la carte par le calcul même qui place les partis, puis comparé à chacun, thème par thème.</p>
    <ul class="promesses">
      <li>${ICONES.coche}<span>Cinq niveaux d'accord, et « Passer » quand vous n'avez pas d'avis : une absence d'avis ne compte jamais comme une position centriste.</span></li>
      <li>${ICONES.coche}<span>Le calcul s'exécute dans votre navigateur. Vos réponses ne sont envoyées nulle part.</span></li>
    </ul>
    <button class="bouton" type="button" id="commencer">Commencer ${ICONES.suite}</button>
    <details class="a-propos"><summary>Comment c'est calculé</summary><div class="prose">
      <p>Vous répondez à <strong>une</strong> affirmation par thème ; les partis ont été notés sur leurs programmes, leurs votes et leurs mesures. On compare donc le sens et la force d'une préférence, pas une équivalence exacte.</p>
      ${q.sans_opinion}</div></details>
  </div></div>`;
  main.querySelector("#commencer").addEventListener("click", () => afficherQuestion(0));
}

function afficherQuestion(i) {
  const items = ordreQuestions();
  i = Math.max(0, Math.min(i, items.length - 1));
  stockage.ecrire("etape", i, true);
  const it = items[i];
  const reponses = stockage.lire("reponses", {}, true);
  const exemples = stockage.lire("exemples", "Québec");
  const axeDe = Object.fromEntries(Object.entries(D.axes).flatMap(([a, d]) => d.indicateurs.map((x) => [x.cle, a])));
  const echelle = D.questionnaire.echelle;

  main.innerHTML = `<div class="scene"><div class="carton">
    <div class="progression" aria-hidden="true">${items.map((x, k) => `<i class="${k < i ? "fait" : k === i ? "actuel" : ""}"></i>`).join("")}</div>
    <div class="reperes"><span>${esc(D.axes[axeDe[it.indicateur]].libelle)}, ${i + 1} sur ${items.length}</span>
      <label>Exemples : <select id="exemples">${D.pays.map((p) => `<option ${p.nom === exemples ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select></label></div>
    <p class="affirmation" id="enonce">${it.enonce}</p>
    <p class="exemple" id="exemple">${it.exemples[exemples] ?? ""}</p>
    <fieldset class="reponses" aria-labelledby="enonce"><legend>Votre réponse</legend>
      ${ECHELLE.map((v) => { const [t, plein] = JALONS[v]; return `<label class="reponse"><input type="radio" name="r" value="${v}" ${reponses[it.indicateur] === v ? "checked" : ""}><span class="jalon${plein ? " plein" : ""}" style="--t:${t}px" aria-hidden="true"></span>${esc(echelle[v])}</label>`; }).join("")}
    </fieldset>
    <div class="navigation-q">
      <button class="lien" type="button" id="precedente" ${i === 0 ? "hidden" : ""}>${ICONES.retour}Précédente</button>
      <button class="lien" type="button" id="passer">Passer, sans opinion ${ICONES.suite}</button>
    </div>
    <p class="etat-calcul" id="etat" aria-live="polite"></p>
  </div></div>`;

  main.querySelector("#exemples").addEventListener("change", (e) => {
    stockage.ecrire("exemples", e.target.value);
    main.querySelector("#exemple").innerHTML = it.exemples[e.target.value] ?? "";
  });
  const suivante = (valeur) => {
    const r = stockage.lire("reponses", {}, true);
    r[it.indicateur] = valeur;
    stockage.ecrire("reponses", r, true);
    if (i + 1 < items.length) afficherQuestion(i + 1);
    else terminer();
  };
  main.querySelectorAll('input[name="r"]').forEach((inp) => inp.addEventListener("change", () => {
    setTimeout(() => suivante(Number(inp.value)), sansMouvement() ? 0 : 220);
  }));
  main.querySelector("#passer").addEventListener("click", () => suivante(null));
  main.querySelector("#precedente").addEventListener("click", () => afficherQuestion(i - 1));
  main.querySelector(`input[name="r"]:checked`)?.focus({ preventScroll: true });
}

async function terminer() {
  const etat = main.querySelector("#etat");
  etat.textContent = "Dépouillement en cours…";
  main.querySelectorAll("input, button").forEach((x) => { x.disabled = true; });
  const reponses = Object.fromEntries(ordreQuestions().map((it) => [it.indicateur, stockage.lire("reponses", {}, true)[it.indicateur] ?? null]));
  let res;
  try {
    res = await calculer(reponses, D.calcul);
  } catch (err) {
    console.error(err);
    etat.textContent = "Le module de calcul n'a pas pu se charger. Vérifiez la connexion, puis choisissez à nouveau votre dernière réponse.";
    main.querySelectorAll("input, button").forEach((x) => { x.disabled = false; });
    return;
  }
  stockage.ecrire("etape", "resultat", true);
  stockage.ecrire("resultat", res, true);
  afficherDepouillement(res, true);
}

function afficherDepouillement(res, animer) {
  scrollTo(0, 0);
  const axes = Object.keys(D.axes);
  const recommencer = () => { stockage.ecrire("reponses", {}, true); stockage.ecrire("etape", "intro", true); stockage.ecrire("repondant", null, true); afficherIntro(); };
  if (axes.some((a) => res.positions[a] == null)) {
    stockage.ecrire("repondant", null, true);
    main.innerHTML = `<div class="scene"><div class="carton">
      <h1>Pas assez d'avis pour vous placer</h1>
      <p class="avertissement">Il faut au moins quatre réponses par thème, économie et société, pour calculer une position. Reprenez les affirmations passées.</p>
      <button class="bouton" type="button" id="modifier">Reprendre mes réponses</button></div></div>`;
    main.querySelector("#modifier").addEventListener("click", () => afficherQuestion(0));
    return;
  }
  stockage.ecrire("repondant", res.positions, true);
  const vous = res.positions;
  const premier = res.classement[0];
  // Le point le plus proche sur la carte n'est pas forcément le premier du
  // classement : les axes résument les réponses, le classement les compare une à une.
  const distance = (p) => Math.hypot(p.positions.economie.valeur - vous.economie, p.positions.societe.valeur - vous.societe);
  const voisin = [...D.partis].sort((a, b) => distance(a) - distance(b))[0];

  main.innerHTML = `<div class="depouillement">
    <div class="depouillement-tete"><h1>Votre résultat</h1>
      <div class="actions-tete"><button class="lien" type="button" id="modifier">${ICONES.retour}Modifier mes réponses</button>
      <button class="lien" type="button" id="recommencer">Recommencer</button></div></div>
    <div class="depouillement-grille">
      <section class="vous-panneau" aria-label="Votre position">
        ${scoresHTML(vous, "var(--violet)")}
        <div class="releve">${carteSVG({ partis: D.partis, sigles: false, vous, titre: "Votre position parmi les partis", echelle: innerWidth < 600 ? 1.75 : 1.7 })}</div>
        <div class="actions"><a class="bouton" href="#/carte">Me voir sur la carte</a></div>
      </section>
      <section aria-labelledby="titre-accords">
        <h2 id="titre-accords" style="margin-bottom:14px">Vos accords, parti par parti</h2>
        <ol class="classement${animer && !sansMouvement() ? " anime" : ""}">${res.classement.map((a, k) => {
          const p = partiParNom(a.nom);
          return `<li${k === 0 ? ' class="premier"' : ""} style="--rang:${k};--couleur-parti:${teinte(p.couleur)}">
            <span class="rang">${k + 1}</span>
            <span class="nom"><a href="#/carte/${p.id}">${esc(p.nom)}</a><small>${esc(p.pays)}</small></span>
            <span class="pct" data-pct="${Math.round(a.pourcentage)}">${Math.round(a.pourcentage)} %</span>
            <span class="jauge"><i style="--p:${a.pourcentage}%"></i></span>
            ${a.fiable ? "" : '<span class="fragile">Peu fiable : trop peu de thèmes en commun</span>'}</li>`;
        }).join("")}</ol>
        ${premier && voisin.nom !== premier.nom ? `<p class="remarque">Sur la carte, votre plus proche voisin est ${esc(voisin.nom)}. La carte résume vos réponses en deux chiffres ; le classement, lui, les compare une à une.</p>` : ""}
        ${premier?.desaccords.length ? `<details class="desaccords"><summary>Vos désaccords avec ${esc(premier.nom)}</summary><ul>
          ${premier.desaccords.map(([cle, v, p]) => `<li><strong>${esc(libelleIndicateur(cle))}</strong> : vous ${signe(v)}, ${esc(premier.nom)} ${signe(p)}</li>`).join("")}</ul></details>` : ""}
      </section>
    </div></div>`;
  main.querySelector("#modifier").addEventListener("click", () => afficherQuestion(0));
  main.querySelector("#recommencer").addEventListener("click", recommencer);

  // Le dépouillement : les pourcentages défilent jusqu'à leur valeur, par rang.
  if (animer && !sansMouvement()) {
    main.querySelectorAll(".pct").forEach((el, k) => {
      const cible = Number(el.dataset.pct), debut = performance.now() + k * 70;
      const pas = (t) => {
        const x = Math.min(Math.max((t - debut) / 900, 0), 1);
        el.textContent = `${Math.round(cible * (1 - (1 - x) ** 4))} %`;
        if (x < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    });
  }
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
      <tbody>${pays.map((pa) => `<tr class="pays"><th colspan="${nbCols + 1}">${esc(pa)}</th></tr>
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
        <span class="cle-legende"><b style="background:var(--signal-fond);color:var(--signal)">∅</b>le parti ne se prononce pas</span>
        <span class="cle-legende"><b style="box-shadow:inset 0 0 0 1px var(--filet)">?</b>pas encore recherché</span>
      </div>`;

    const positions = `<div class="defile"><table class="positions">
      <thead><tr><th>Parti</th><th>Chef</th><th>Territoire</th>${axes.map((a) => `<th class="nombre">${esc(a.libelle)}</th>`).join("")}</tr></thead>
      <tbody>${partis.map((p) => `<tr><td><a href="#/carte/${p.id}">${icone(p.pays, teinte(p.couleur))}${esc(p.nom)}</a></td><td>${esc(p.chef ?? "")}</td><td>${esc(p.pays)}</td>
        ${Object.keys(D.axes).map((a) => `<td class="nombre">${signe(p.positions[a].valeur)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

    main.innerHTML = `<div class="page">
      <div class="page-tete"><div><h1>Comparer les partis</h1>
        <p class="intro">Les notes de chaque parti, thème par thème, de −2 à +2.</p></div>${filtreHTML()}</div>
      <div class="volets-page" role="tablist">
        <button type="button" role="tab" data-v="indicateurs" aria-selected="${volet === "indicateurs"}">Notes par thème</button>
        <button type="button" role="tab" data-v="positions" aria-selected="${volet === "positions"}">Positions</button></div>
      ${volet === "indicateurs" ? matrice : positions}</div>`;
    brancherFiltre(main, rendre);
    main.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => { volet = b.dataset.v; rendre(); }));
  };
  rendre();
}

// ------------------------------------------------------------------ méthode
function pageMethode() {
  main.innerHTML = `<div class="methode"><article class="prose">${D.grille}</article></div>`;
}

// ------------------------------------------------------------------ navigation
function router() {
  cacherBulle();
  const [, page = "carte", arg] = location.hash.split("/");
  document.querySelectorAll(".onglets a").forEach((a) => {
    if (a.dataset.page === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const titres = { questionnaire: "Me situer", comparer: "Comparer", methode: "Méthode" };
  const parti = page === "carte" && arg ? partiParId(arg) : null;
  document.title = parti ? `${parti.nom} · Politiscope` : titres[page] ? `${titres[page]} · Politiscope` : "Politiscope";
  const pages = { carte: () => pageCarte(arg), questionnaire: pageQuestionnaire, comparer: () => pageComparer(), methode: pageMethode };
  (pages[page] ?? pages.carte)();
  if (!(page === "carte" && arg)) scrollTo(0, 0);
}

function bandeauDirect() {
  const jours = Math.ceil((ELECTION_QUEBEC - Date.now()) / 86400000);
  if (jours < 0) return;
  const el = document.getElementById("direct");
  el.innerHTML = `<span class="pastille" aria-hidden="true"></span><span>Québec : <b>élection le 5 octobre</b>${jours > 1 ? `, dans ${jours} jours` : jours === 1 ? ", demain" : ", aujourd'hui"}</span>`;
  el.hidden = false;
}

async function demarrer() {
  try {
    D = await (await fetch("donnees.json")).json();
  } catch {
    main.innerHTML = '<p class="chargement">Les données n\'ont pas pu être chargées. Rechargez la page.</p>';
    return;
  }
  if (D.meta.mise_a_jour) document.getElementById("date-donnees").textContent = `. Données au ${D.meta.mise_a_jour}`;
  bandeauDirect();
  addEventListener("hashchange", router);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", router);
  let palier = agrandissement();
  addEventListener("resize", () => { if (agrandissement() !== palier) { palier = agrandissement(); router(); } });
  router();
}

demarrer();
