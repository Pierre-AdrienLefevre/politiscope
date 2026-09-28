# Politiscope

Carte interactive des principales figures politiques des États-Unis, du Canada,
du Québec et de la France, positionnées sur deux axes **communs aux quatre
territoires**.

## But du projet

Permettre à quelqu'un de répondre à un questionnaire et de découvrir de quelles
figures politiques il est le plus proche — en France comme au Québec, au Canada
ou aux États-Unis.

La carte n'est donc pas la finalité : c'est l'affichage d'un instrument de
mesure. Le questionnaire et le positionnement des figures doivent utiliser
**exactement la même grille d'items**, sinon les résultats ne sont pas
comparables.

État actuel : la chaîne complète tourne. Les positions sont **calculées** par
`scoring.py` à partir des indicateurs sourcés de `data/entities.yaml`, selon le
barème de `data/grille.md`. Tant qu'une entité porte moins de quatre
indicateurs notés sur un axe, elle reste à son `estimation_initiale` et est
dessinée en **marqueur creux** — on ne confond jamais une position mesurée avec
une intuition.

Avancement du sourçage : **230 cellules sur 252 (91 %)**, avec 319 sources référencées (affiché dans l'app). **Les dix-huit partis des quatre territoires sont mesurés sur les deux axes.**
Sur les 22 cellules restantes, 17 sont des `absent` documentés — recherche
faite, le parti ne se prononce pas — et 5 sont des trous assumés.

## Les entités sont des partis

Les sources de rang 1 — plateformes, cadres financiers, votes — sont toujours
des documents de parti, jamais des documents de personne. Les entités sont donc
des partis, avec le chef en sous-titre (champ `chef`). Cela règle aussi le cas
des coalitions : « Parti démocrate » n'a pas de position unique sur l'avortement
ou la fiscalité, et le signaler vaut mieux que d'en inventer une.

Conséquence assumée : Macron et Attal étant tous deux Renaissance, ils
fusionnent en une entité portée par Attal (candidat déclaré, Macron ne pouvant
se représenter), le bilan du président sortant restant dans le résumé.

## Les deux axes

| Axe | Pôle négatif (−10) | Pôle positif (+10) |
|-----|--------------------|--------------------|
| Horizontal — **Économie** | État | Marché |
| Vertical — **Société** | Progressiste | Conservateur |

Deux axes seulement, volontairement.

L'axe « autorité » (libertaire / autoritaire) présent dans une version
précédente a été retiré des axes : il mesure une *pratique du pouvoir* (recours
aux décrets, rapport aux contre-pouvoirs), qu'un répondant au questionnaire n'a
pas. Il n'est donc pas co-mesurable entre les figures et l'utilisateur. Il est
conservé comme indicateur descriptif dans la fiche de chaque figure.

Le vocabulaire « socialiste / libéral » a également été abandonné : « libéral »
désigne le centre au Québec et au Canada, la gauche aux États-Unis et la droite
économique en France. « État / Marché » est univoque dans les quatre
territoires.

## Une seule carte, pas quatre

Le pari du projet est de placer les quatre territoires sur la même carte. Cela
n'est défendable qu'à une condition : **les items doivent porter sur la
politique publique, jamais sur l'institution nationale.**

- Recevable partout : « L'État devrait garantir une assurance santé publique
  universelle. »
- Non recevable : « Êtes-vous favorable à la Loi 21 ? »

Les questions propres à un territoire (Loi 21, taxe carbone, deuxième
amendement, retraite à 62 ans) forment un **bloc national** : elles enrichissent
la fiche d'une figure mais **n'alimentent pas** les deux axes partagés. Sans
cette séparation, les axes cessent d'être comparables d'un pays à l'autre.

Pour lire un seul territoire à la fois, le filtre « Territoires » en haut de la carte
suffit — inutile de produire des cartes séparées.

## Méthodologie visée

Les positions ne sont pas posées directement mais **calculées** :

1. Une batterie d'items communs, ~10 par axe, formulés comme des affirmations
   de politique publique.
2. Chaque figure est notée sur chaque item de **−2 à +2 par pas de 0,5**
   (opposition ferme → soutien ferme), d'après son programme, ses votes et les
   mesures prises.
3. La position sur l'axe est la moyenne pondérée des items, rééchelonnée en
   **−10 … +10 avec une décimale**.

Les neuf niveaux de notation et la pondération produisent une granularité bien
supérieure aux 21 positions entières de l'axe, et surtout chaque score devient
traçable jusqu'aux items qui le produisent. Une échelle plus fine posée à la
main ne serait que de la fausse précision : la précision vient de l'agrégation,
pas du nombre de graduations.

Là où des données existent, les scores doivent être ancrés dessus plutôt
qu'estimés : le **Chapel Hill Expert Survey** et **V-Party** couvrent les partis
français et canadiens sur des axes proches. Ce qui reste estimé à la main doit
être signalé comme tel.

## Questionnaire

Construit et fonctionnel (`data/questions.yaml`, `questionnaire.py`, mode
« Questionnaire » dans l'app).

- **14 items, un par indicateur**, sur l'échelle −2 … +2, avec une option
  « sans opinion » qui retire l'item et renormalise les poids — jamais comptée
  comme un 0.
- La position du répondant est calculée par **exactement la même fonction** que
  celle des partis (`scoring.calculer_axe`), sur les mêmes indicateurs et avec
  les mêmes poids. C'est ce qui rend les deux positions comparables. Le seuil de
  quatre indicateurs par axe s'applique aussi au répondant.
- Chaque item porte un champ `sens` : « tout à fait d'accord » ne pointe pas
  toujours vers le même pôle, et forcer toutes les questions à pointer dans le
  même sens produirait des formulations tordues.
- Le classement de proximité se fait **item par item** (pourcentage d'accord
  pondéré), pas à la distance euclidienne sur les deux axes.
- Un champ `exemples` propre à chaque territoire rend l'item concret sans jamais
  entrer dans le calcul.

**Asymétrie assumée.** Le répondant note un indicateur sur *une* affirmation ;
les partis l'ont été sur un faisceau de documents, de votes et de mesures
prises. La comparaison porte sur la direction et l'intensité d'une préférence,
pas sur une équivalence de nature. C'est dit au répondant dans l'app.

L'app signale d'elle-même le cas où le point le plus proche sur la carte n'est
pas le premier du classement d'accord — ce n'est pas un bug, les deux axes
résument quatorze indicateurs sans les remplacer.

## Modifier les données

Tout est dans `data/entities.yaml`, sans toucher au code :

- `axes` définit les indicateurs, leurs poids et le seuil `min_indicateurs`.
- `entities[].indicateurs` porte les notes de −2 à +2, chacune avec sa
  justification (`just`), ses `src` et, si le score se discute, un champ
  `contest` affiché en avertissement dans la fiche.
- `entities[].estimation_initiale` est le score posé à la main, utilisé tant que
  l'axe n'atteint pas le seuil.
- `sources` liste les références, avec `rang` (1 = texte primaire, 5 = presse)
  et `acces` quand la source est douteuse ou derrière un paywall.
- `label_pos` (optionnel) déplace l'étiquette si deux noms se chevauchent.

Les attributs hors axes — `souverainete`, `ecologie`, `autorite` — sont
descriptifs et n'entrent dans aucun calcul.

Version initiale, avec des positions entièrement estimées à la main :
`data/entities.legacy.yaml`.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `app.py` | Point d'entrée Streamlit : navigation entre les pages |
| `vues/` | Les quatre pages : carte, questionnaire, comparaison, méthode |
| `commun.py` | Chargement des données et réglages visuels partagés |
| `.streamlit/config.toml` | Thème : polices, couleurs claires et sombres |
| `scoring.py` | Indicateurs → position, renormalisation des poids, seuil |
| `valider.py` | Contrôle d'intégrité des données (`uv run python valider.py`) |
| `data/entities.yaml` | Entités, indicateurs notés, sources |
| `data/grille.md` | Barème de notation, dimensions exclues, limites assumées |
| `questionnaire.py` | Position du répondant, classement d'accord item par item |
| `data/questions.yaml` | Les 14 items, avec `sens` et exemples par territoire |
| `data/notation_quebec.yaml` | Notes de travail sur le Québec |

## Chantiers en cours

### Le test de calibrage a été passé

Plusieurs bornes ±2 avaient été réservées à des positions américaines
**supposées** et jamais mesurées : l'avortement post-Dobbs, les interdictions
d'enseignement sur le genre, le *right-to-work*, la contestation de la couverture
universelle, les peines planchers. À chaque fois, un parti français ou québécois
avait été maintenu sous +2 au nom d'une position qu'on n'avait pas vérifiée.

**La notation des États-Unis a tranché**, et dans les deux sens :

- **Confirmées sur pièces** : S2 (13 États interdisent totalement l'avortement,
  4 autres à six semaines) et S3 (la définition posée — interdictions
  d'enseignement, retraits d'ouvrages, restrictions visant les adultes — décrit
  terme à terme la politique constatée).
- **Confirmées mais mal formulées** : E3 (« contestation de la couverture
  universelle » n'est pas la doctrine républicaine de 2024, mais l'effet est de
  10 millions de désassurés — la borne devrait être un critère d'effet) et E5
  (le *right-to-work* n'est pas une position de parti, alors que la suppression
  par décret du droit de négociation collective pour plus d'un million d'agents
  l'est).
- **Débordée** : S1, S6, S7, E2 et E6, où le Parti républicain dépasse tous les
  ancrages européens et québécois.

### Limite structurelle restante : la saturation des bornes

L'échelle ±2 sature aux extrêmes, et trois cas sont documentés :

- **PCF et LFI à −10,0** en économie, six indicateurs sur six à la borne : le
  plancher les rend indiscernables alors qu'un écart réel les sépare.
- **RN, Reconquête et Parti républicain tous à +2** sur l'immigration, pour des
  valeurs réelles estimées à ≈ +2,5, ≈ +3 et ≈ +3,25.
- **L'axe économique ne peut pas représenter le Parti républicain**, qui est
  simultanément le dérégulateur le plus radical et l'interventionniste sur les
  prix le plus radical — les droits de douane étant exclus de l'axe par la règle
  sur le protectionnisme. C'est la limite méthodologique la plus sérieuse de
  l'exercice.

### Réserves à lever sur le Québec

- **Vote sur le projet de loi 89 / loi 14** (droit de grève, 29 mai 2025) : la
  fiche de l'Assemblée donne les totaux (94 pour, 17 contre) mais ne ventile pas
  par parti. La ventilation utilisée vient d'une source unique en HTTP 403. Si
  elle était infirmée, les notes E5 du PLQ et du PQ changeraient. À chercher dans
  le Journal des débats sur assnat.qc.ca.
- **Retraites de Québec solidaire** : marqué `absent`, mais
  `plateforme.quebecsolidaire.net` refuse la négociation TLS. QS porte
  historiquement des positions sur la bonification du RRQ. À relire avec un
  client TLS différent avant de figer.
- **Questionnaire LGBT+ de la revue *Fugues*** : envoyé aux cinq partis le
  15 septembre 2026, sans réponse publiée au 17. À reprendre **après le
  20 septembre 2026** : ce serait la meilleure source pour consolider S3, dont
  quatre notes sur cinq reposent sur des actes plutôt que sur des engagements.
- **Comparateur de Radio-Canada** : les données sont chargées à l'exécution et
  inaccessibles en HTTP brut. Nécessite un vrai navigateur.

### Péremption

Les entités québécoises portent `as_of: 2026-09-17`. **L'élection générale a
lieu le 5 octobre 2026** : les plateformes resteront valides comme positions
datées, mais les chefs et le parti au pouvoir peuvent changer.

## Lancer en local

```sh
uv sync
uv run streamlit run app.py
```

## Déployer gratuitement

1. Pousser le dossier sur un repo GitHub
2. Aller sur share.streamlit.io, se connecter avec GitHub
3. Choisir le repo, la branche et `app.py`, puis déployer

## Avertissement

Les positions sont des estimations basées sur les programmes, les votes et les
mesures prises. Elles se discutent, et l'intérêt de la méthode par items est
justement de rendre le désaccord précis : on peut contester un item plutôt que
l'ensemble d'un score.
