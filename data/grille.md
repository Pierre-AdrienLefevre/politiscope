# Grille de notation

Document de travail interne. Ce n'est pas le questionnaire public : c'est le
barème qui permet de noter les figures politiques de façon reproductible et
sourçable. Le questionnaire en sera plus tard la traduction grand public.

## Principe

Chaque figure reçoit une note de **−2 à +2 par pas de 0,5** sur chacun des 14
indicateurs ci-dessous — soit neuf niveaux : −2, −1,5, −1, −0,5, 0, +0,5, +1,
+1,5, +2.

Les demi-points ont été préférés à un élargissement de l'échelle à ±4, qui
aurait offert la même granularité : ils laissent les **ancrages ci-dessous
inchangés** (−2 signifie toujours « nationalisations », +2 « privatisations »),
alors que passer à ±4 aurait obligé à redéfinir chaque borne et à relire toutes
les cellules déjà notées. Les demi-points servent à résoudre les arbitrages
que le champ `contest` documentait comme forcés. La position sur un axe est la moyenne pondérée de ses indicateurs,
multipliée par 5 pour obtenir l'échelle **−10 … +10**, arrondie à une décimale.

```
position_axe = 5 × Σ(note_i × poids_i) / Σ(poids_i)
```

Un indicateur sans source exploitable est laissé vide et retiré du calcul, les
poids étant renormalisés sur les indicateurs restants. Une figure notée sur
moins de 4 indicateurs par axe est signalée comme peu fiable.

## Calibrage des bornes : la règle du plus radical observable

**Les bornes −2 et +2 sont réservées à la position la plus radicale observable
dans les quatre territoires réunis, pas à la plus radicale du territoire
considéré.** Sans cette règle, chaque pays est noté par rapport à lui-même et la
carte commune perd son sens — c'était le défaut principal de la première
version du projet.

Cette règle a été découverte en notant Québec solidaire. Les quatre indicateurs
économiques sourcés correspondaient tous à la définition du −2, ce qui plaçait
QS au maximum théorique de l'axe. Or QS accepte l'économie de
marché, alors que le PCF et LFI proposent de nationaliser l'énergie et les
banques : si QS est déjà au mur, ces derniers n'ont plus de place.

L'indicateur E2 de QS a donc été ramené à −1, avec la justification explicite
que le −2 est réservé aux programmes de nationalisation, ce qui a dégagé la
marge nécessaire aux positions réellement plus à gauche.

En pratique, quand une note de −2 ou +2 est envisagée, il faut se demander :
*existe-t-il, dans l'un des quatre territoires, une position plus radicale sur
cet indicateur ?* Si oui, la note descend d'un demi-point ou plus, et le champ
`contest` documente l'arbitrage.

### La recalibration de septembre 2026 : ce que la France a déplacé

La notation de la France a entraîné **onze révisions de notes québécoises**,
toutes documentées dans le champ `contest` de la cellule concernée. C'est la
preuve que la règle fonctionne : un fait français a déplacé un seuil québécois,
ce qui est exactement ce qu'une carte commune doit permettre.

| Indicateur | Révision | Cause |
|---|---|---|
| E1 | QS −2 → −1,5 | Le PCF triple le rendement de l'ISF et porte l'IR à 15 tranches ; LFI propose un « héritage maximum » |
| E5 | QS −2 → −1,5 | La position de QS repose sur une seule mesure ; LFI et le PCF ajoutent 32 h, congés, suspension des licenciements |
| E6 | QS −2 → −1,5 | LFI bloque les prix par décret ; le PCF nationalise banques, assurances et énergie |
| S1 | QS −2 → −1,5 | LFI ajoute régularisation massive, droit du sol intégral, droit de vote des étrangers |
| S1 | PQ et PCQ +2 → +1,5 | Le RN supprime le droit du sol et renvoie l'asile aux ambassades ; Reconquête vise un solde migratoire négatif |
| S3 | PCQ +1,5 → +1 | La PPL LR adoptée au Sénat interdit bloqueurs, hormones croisées **et** chirurgie pour les mineurs |
| S5 | PLQ −1,5 → −1 ; QS −1 → −0,5 | LFI est la seule force du compas à vouloir lever une restriction religieuse en vigueur |
| S5 | CAQ et PQ +2 → +1 ; PCQ +1 → +0,5 | LR interdirait le voile à l'université (usagères adultes) et inscrirait une tradition confessionnelle dans la Constitution |
| S6 | QS −2 → −1,5 | Le PCF supprime le privé scolaire au lieu de l'absorber |
| S7 | CAQ +1 → +0,5 | Un renfort d'effectifs ne vaut pas une réforme du droit pénal |

**Deux dépassements restent non résorbés**, faute de place sur l'échelle : sur
S1 et S5, le RN (≈ +2,5) et Reconquête (≈ +3) sont tous deux comprimés à +2, ce
qui écrase une distance réelle et documentée entre eux.

### Limite non résolue : les bornes restent encombrées

La question posée quand seul le Québec était noté — « les bornes sont-elles trop
larges ? » — a été tranchée par la notation de la France et des États-Unis, et
la réponse est mitigée.

Les demi-points ont affiné le centre mais n'ont pas dégagé les extrêmes. Trois
saturations subsistent et sont irréductibles à l'échelle actuelle :

- **Le PCF et LFI sont tous deux à −10,0** en économie, six indicateurs sur six
  à la borne. Le plancher les rend indiscernables alors que le PCF nomme les
  établissements à nationaliser et que LFI s'appuie sur des outils publics
  existants.
- **Le RN, Reconquête et le Parti républicain sont tous trois comprimés à +2**
  sur l'immigration, pour des valeurs réelles estimées à ≈ +2,5, ≈ +3 et
  ≈ +3,25. Trois positions distinctes s'affichent identiques.
- **L'axe économique ne peut pas représenter le Parti républicain**, qui est
  simultanément le dérégulateur le plus radical et l'interventionniste sur les
  prix le plus radical — les droits de douane étant exclus de l'axe par la règle
  sur le protectionnisme. C'est la limite méthodologique la plus sérieuse de
  l'exercice, et elle n'a pas de correctif propre : inclure les tarifs
  déplacerait les partis nationalistes vers la gauche économique pour une raison
  qui n'est pas économique.

## Axe Économie — État (−10) … Marché (+10)

| # | Indicateur | Poids | −2 | +2 |
|---|-----------|-------|----|----|
| E1 | **Fiscalité** | 1,0 | Forte progressivité, impôt sur la fortune et le capital, hausse du niveau global | Baisse générale des impôts, fiscalité à taux réduit sur le capital, pas d'impôt sur la fortune |
| E2 | **Périmètre de l'État** | 1,0 | Nationalisations (énergie, banques, rail), hausse de la dépense publique et des effectifs | Privatisations, réduction de la dépense publique et du nombre de fonctionnaires |
| E3a | **Santé** | 0,5 | Couverture publique universelle, éviction du privé | Couverture ciblée ou assurantielle, place importante du privé |
| E3b | **Assurance chômage** | 0,5 | Indemnisation longue et généreuse, conditions d'accès larges | Durée raccourcie, dégressivité, resserrement des conditions |
| E4 | **Retraites** | 1,0 | Abaissement de l'âge de départ, hausse des pensions, financement par répartition élargi | Report de l'âge de départ, allongement de la durée de cotisation, place accrue de la capitalisation |
| E5 | **Marché du travail** | 0,8 | Hausse forte du salaire minimum, renforcement du droit du travail et des syndicats | Flexibilisation, salaire minimum laissé au marché, affaiblissement des protections |
| E6 | **Régulation** | 0,8 | Encadrement des prix, régulation sectorielle et environnementale contraignante | Dérégulation, retrait des normes, confiance au marché pour l'allocation |

### Pourquoi la santé et le chômage sont séparés

À l'origine, un seul indicateur E3 agrégeait les deux. La notation des quatre
territoires a montré que **le corpus était systématiquement scindé** : les sept
partis nord-américains y étaient notés sur la santé seule, les partis français
largement sur le chômage. Les deux moitiés d'une même note ne mesuraient donc
pas la même chose selon le pays.

La scission en E3a et E3b, à 0,5 de poids chacun, laisse le total de l'axe
inchangé à 5,6 et rend visible ce qui était masqué. Effet mesuré sur les
positions : **inférieur à 0,6 point pour tous les partis**, ce qui infirme
l'hypothèse de départ — l'agrégation ne déformait pas les comparaisons, la
renormalisation des poids absorbait déjà l'essentiel.

Ce que la scission a réellement révélé, en revanche :

- **Renaissance n'a aucune position santé documentée** (`absent` sur E3a) :
  aucune convention thématique santé publiée, et la mesure gouvernementale la
  plus significative — le doublement des franchises médicales de 2024 — n'a pas
  pu être sourcée. C'était invisible derrière une note agrégée de +1.
- **Le Parti socialiste passe à −2 sur la santé**, à égalité avec Québec
  solidaire sur l'éviction du privé. L'ancienne note plafonnait à −1,5 à cause
  de l'abstention du groupe sur le texte chômage : deux objets distincts se
  neutralisaient.
- **Le NPD canadien dépasse l'ancrage français sur le chômage.** Le volet
  chômage de LFI et du PCF est essentiellement abrogatoire ; celui du NPD est
  une refondation chiffrée (360 heures, 50 semaines, plancher de 450 $/semaine).
- **L'assurance chômage relève exclusivement du fédéral au Canada** : les cinq
  partis québécois sont `absent` sur E3b par absence de compétence, non par
  défaut de recherche. Les deux partis américains ne sont pas encore recherchés
  sur ce volet — l'indemnisation y est administrée État par État.

Les retraites restent hors de ces deux indicateurs : elles forment E4. Les
compter ailleurs reviendrait à pondérer deux fois la même position.

**Asymétrie assumée sur E4.** Les retraites sont un clivage majeur en France
(retraite à 60 ans, report de l'âge) et marginal dans une campagne provinciale
québécoise, où le RRQ n'est pas en débat. L'indicateur sera donc souvent `null`
au Québec. La renormalisation des poids le gère, mais cela signifie que les
territoires ne sont pas tous notés sur le même sous-ensemble d'indicateurs — à
signaler dans la fiche.

## Axe Société — Progressiste (−10) … Conservateur (+10)

| # | Indicateur | Poids | −2 | +2 |
|---|-----------|-------|----|----|
| S1 | **Niveaux d'immigration** | 1,0 | Hausse ou maintien des seuils, régularisations, accès facilité à la nationalité | Baisse forte des seuils, restriction du regroupement familial, expulsions accrues |
| S2 | **Droits reproductifs** | 1,0 | Accès garanti et inscrit dans la loi, remboursement | Restriction de l'accès, réduction des délais, opposition au remboursement |
| S3 | **Droits LGBT+** | 1,0 | Extension (parentalité, transition, protection contre les discriminations) | Opposition à l'extension, restriction des droits existants |
| S4 | **Fin de vie** | 1,0 | Aide médicale à mourir accessible, élargissement des critères | Opposition à l'aide médicale à mourir, restriction des critères existants |
| S5 | **Modèle d'intégration** | 0,6 | Multiculturalisme, reconnaissance de la diversité religieuse dans l'espace public | Assimilation, restriction des signes religieux, identité culturelle de référence |
| S6 | **Éducation et transmission** | 0,6 | École publique laïque et inclusive, éducation à la sexualité, programmes critiques | Financement du privé et du confessionnel, récit national, encadrement des contenus sur le genre |
| S7 | **Justice pénale** | 0,8 | Priorité à la réinsertion, réduction du recours à l'incarcération | Fermeté pénale, peines planchers, élargissement des pouvoirs de police |

### Pourquoi la fin de vie (S4)

C'est le meilleur indicateur ajouté : il est comparable dans les quatre
territoires (le Québec est pionnier de l'aide médicale à mourir, la France a
légiféré récemment, les États-Unis décident État par État), il est
discriminant, et il est largement **indépendant** de S2 et S3 — des
conservateurs y sont favorables au nom de la liberté individuelle, des
progressistes s'y opposent au nom des droits des personnes handicapées. Un
indicateur qui ne se déduit pas des autres est précisément ce qui fait gagner de
l'information à un axe.

### Le problème que corrige la scission S1 / S5

Dans la version précédente, « Immigration » et « Pluralisme culturel » étaient
deux indicateurs quasi redondants : sur tes données, Le Pen et Zemmour saturent
les deux, Fréchette restreint l'immigration *et* défend la Loi 21, Milliard est
ouvert sur l'immigration *et* critique de la Loi 21. Avec des poids de 1,0 et
0,8, la question migratoire pesait 1,8 sur 4,6 — soit 39 % de l'axe Société à
elle seule, ce qui en faisait un axe de l'immigration déguisé.

La scission sépare désormais le **niveau** (combien de personnes accueillir, S1)
du **modèle** (comment organiser la coexistence, S5), et le poids de S5 descend
à 0,6. Les deux restent corrélés dans les faits — c'est la réalité politique,
pas un défaut de la grille — mais l'axe ne se réduit plus à une seule question.

### Ce que je n'ai pas ajouté, et pourquoi

- **Langue et défense du français** : très saillant au Québec, mais c'est la
  même dimension que S5. L'ajouter reviendrait à repondérer l'identité
  culturelle à la hausse, exactement ce qu'on vient de corriger. Traité dans la
  note descriptive.
- **Armes à feu** : bon discriminant aux États-Unis et au Canada, quasi nul en
  France. Trop asymétrique pour un indicateur partagé.
- **Drogues et cannabis** : surtout un marqueur libertaire/autoritaire, donc
  rattaché à la dimension autorité qui a été retirée des axes.

## Ce qui est délibérément exclu des axes

Trois dimensions ne sont **pas** notées sur les axes, parce qu'elles ne s'y
projettent pas sans produire des positions fausses.

### Commerce extérieur et protectionnisme

Le protectionnisme n'est pas une position sur l'axe État/Marché : Trump est
simultanément protectionniste et dérégulateur, Le Pen protectionniste et
favorable aux petites entreprises, Mélenchon protectionniste et étatiste. Compter
les droits de douane comme « anti-marché » déplace mécaniquement les figures
nationalistes vers la gauche économique pour une mauvaise raison.

→ Rattaché à l'attribut **souveraineté**.

### Accès différencié selon la nationalité

La priorité nationale dans les prestations sociales, le remplacement de l'aide
médicale d'État par une aide d'urgence, la réservation des prestations aux
étrangers justifiant de plusieurs années de travail : ces mesures sont notées en
**S5 (modèle d'intégration)**, jamais en E3 ni en S1.

Raison : restreindre des prestations selon la nationalité ne rend pas le système
plus marchand. Un État social intégralement public et généreux peut parfaitement
être réservé aux nationaux. Les compter en E3 déplacerait mécaniquement les
partis nationalistes vers la droite économique pour une raison qui n'est pas
économique — exactement le confondant du protectionnisme, déjà exclu de l'axe.
Ce n'est pas S1 non plus, qui mesure le nombre d'entrées, que ces mesures ne
changent pas. La priorité nationale est une doctrine sur les droits attachés à
la présence par opposition à ceux attachés à la citoyenneté : c'est un modèle
d'intégration.

L'enjeu est mesurable : sans cette règle, le Rassemblement national passerait de
−0,5 à +1 sur E3, soit un déplacement d'un point et demi sur l'axe économique, et
Reconquête passerait de `absent` à +1.

### Souveraineté

Ni un axe ni un degré : une question de régime constitutionnel. Ghazal (QS) et
St-Pierre Plamondon (PQ) sont tous deux souverainistes et opposés sur les deux
axes ; Milliard (PLQ) et Fréchette (CAQ) tous deux fédéralistes et éloignés.
La souveraineté traverse les axes, elle ne s'y réduit pas.

→ Attribut catégoriel, valeurs par territoire :

| Territoire | Valeurs possibles |
|-----------|-------------------|
| Québec | `independantiste`, `nationaliste`, `federaliste` |
| Canada | `souverainiste`, `continentaliste`, `multilateraliste` |
| France | `souverainiste`, `europeen_reformiste`, `federaliste_europeen` |
| États-Unis | `unilateraliste`, `multilateraliste` |

La *direction* est comparable d'un territoire à l'autre, la *magnitude* non :
« quitter le Canada » et « renégocier les traités européens » ne sont pas de
même intensité. Acceptable pour un attribut descriptif, inacceptable pour un
axe — d'où ce choix.

### Rapport à l'autorité

Mesure une pratique du pouvoir (décrets, rapport aux contre-pouvoirs, respect
des décisions de justice), qu'un répondant au questionnaire n'exerce pas. Non
co-mesurable entre les figures et l'utilisateur.

→ Conservé comme note descriptive dans la fiche, hors axes.

## Deux règles nées de la notation du Québec

### Les engagements conditionnels à un changement de régime ne sont pas notés

Seules les mesures applicables **sous le cadre constitutionnel en vigueur**
entrent dans le calcul. Les engagements qui présupposent l'indépendance, la
souveraineté ou un transfert de compétences non acquis relèvent du résumé et de
l'attribut `souverainete`.

Le cas qui a forcé la règle : le seul engagement chiffré du Parti québécois sur
les pensions — 8,1 G$ de prestations additionnelles aux aînés sur cinq ans,
versées à tous les bénéficiaires d'une rente du RRQ — figure dans *Les finances
d'un Québec indépendant* et relève du budget de l'an 1 d'un Québec souverain. Or
le PQ s'est engagé à ne tenir aucun référendum avant le 20 janvier 2029 : la
mesure n'est pas opérante dans le mandat soumis au scrutin. Le PQ est donc
`absent` sur E4, et non −1.

Sans cette règle, un parti indépendantiste serait noté sur deux programmes à la
fois et deviendrait incomparable avec les autres.

### Le biais du sortant, identifié mais non corrigé

La hiérarchie des sources place les « mesures effectivement prises » au rang 3,
au-dessus de la presse. C'est justifié — un budget voté vaut mieux qu'une
promesse — mais cela **avantage structurellement les partis qui ont exercé le
pouvoir**, seuls en mesure d'agir.

Le cas visible : sur S2, la CAQ (−1,5) se classe plus protectrice que le PLQ
(−1) essentiellement parce qu'elle a pu lancer un plan d'action financé, là où le
PLQ ne dispose que d'interventions parlementaires. Rien ne dit qu'un PLQ au
pouvoir n'aurait pas fait autant.

Aucune correction n'est appliquée : pondérer à la baisse les mesures prises
reviendrait à préférer les promesses aux actes, ce qui serait pire. Mais l'écart
sortant/opposition doit être lu comme un artefact possible, en particulier quand
il est faible.

## Points méthodologiques contestables, assumés

À garder visibles plutôt qu'à masquer — ce sont les endroits où un lecteur
sérieux aura raison de discuter.

1. **S4 est l'indicateur le plus fragile.** Ranger la laïcité restrictive du
   côté conservateur est discutable : en France comme au Québec, la laïcité a
   une origine progressiste, et la Loi 21 est soutenue par des nationalistes de
   gauche comme de droite. L'indicateur est donc formulé sur le *pluralisme
   culturel* plutôt que sur la laïcité, ce qui reste imparfait.
2. **Le climat reste hors axes, après examen.** Tentation initiale : en faire un
   indicateur économique autonome. Mais un indicateur de *contrainte
   réglementaire* ne distingue pas Roussel (nucléaire d'État, planification) de
   Mélenchon (planification écologique) — tous deux sont pro-contrainte. Ce qui
   les sépare, c'est la priorité écologique face au productivisme, qui est une
   question de valeurs et non de rapport au marché. Le climat ne se projette donc
   proprement sur aucun des deux axes : c'est une troisième dimension, comme la
   souveraineté et l'autorité.
   → Les politiques climatiques restent notées via E6 (régulation), et un
   attribut descriptif `ecologie` (`productiviste`, `reformiste`,
   `planificateur`, `decroissant`) porte la distinction hors axes.
3. **Les poids sont posés, pas dérivés.** 1,0 pour les indicateurs structurants,
   0,8 pour les autres. Aucune analyse factorielle ne les justifie.
4. **Personnes et partis sont notés sur la même grille.** Or un parti-coalition
   (Parti démocrate) n'a pas de position unique : sa note est une moyenne qui
   masque un écart interne considérable. À trancher.

## Sources

Ordre de préférence pour noter un indicateur :

1. **Texte primaire** — programme, plateforme électorale, projet de loi, décret.
2. **Vote enregistré** — scrutins publics, positions officielles en séance.
3. **Mesure effectivement prise** — pour les figures ayant exercé le pouvoir.
4. **Enquête d'experts** — pour cadrer un ordre de grandeur, jamais comme
   source unique d'un indicateur.
5. **Presse de référence** — en dernier recours, pour un fait daté et vérifiable.

Chaque figure porte dans `entities.yaml` un champ `sources` : une entrée par
indicateur noté, avec l'URL et la date de consultation.

### Couverture des enquêtes d'experts

Aucune base ne couvre les quatre territoires. C'est la principale limite du
projet et elle doit être écrite noir sur blanc :

| Territoire | Couverture |
|-----------|-----------|
| France | Bonne — Chapel Hill Expert Survey, V-Party, Manifesto Project |
| Canada (fédéral) | Partielle — V-Party, Manifesto Project |
| États-Unis | Partielle — V-Party, Manifesto Project (partis, pas personnes) |
| Québec (provincial) | **Faible** — pas de couverture par les enquêtes comparatives |

Les cinq figures québécoises devront donc être notées presque entièrement sur
textes primaires. Ce sont les positions les plus exposées à la critique, et
elles doivent être signalées comme telles.
