"""Vérifie que l'app s'exécute sans exception sur chacune de ses pages.

Streamlit n'exécute son script qu'à la connexion d'un navigateur : un lancement
silencieux ne prouve rien. `AppTest` rejoue le script comme le ferait un
navigateur, rend une fiche, soumet le questionnaire et parcourt les pages.

Usage : `uv run python scripts/verifier_app.py` (sort en code 1 sur exception).
"""

import sys
from pathlib import Path

from streamlit.testing.v1 import AppTest

RACINE = Path(__file__).resolve().parent.parent


def verifier(at: AppTest, etape: str) -> None:
    if at.exception:
        print(f"ÉCHEC ({etape}) : {at.exception}")
        sys.exit(1)
    print(f"ok : {etape}")


at = AppTest.from_file(str(RACINE / "app.py"), default_timeout=180).run()
verifier(at, "carte")
at.selectbox[0].select("Québec solidaire").run()
verifier(at, "fiche d'un parti")
at.switch_page("vues/questionnaire.py").run()
at.button[0].click().run()
verifier(at, "soumission du questionnaire")
for page in ["vues/partis.py", "vues/methode.py"]:
    at.switch_page(page).run()
    verifier(at, page)
