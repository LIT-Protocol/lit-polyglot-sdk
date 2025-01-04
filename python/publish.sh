#!/bin/bash

python -m pip install --upgrade build && python -m build && python -m twine upload dist/* --username __token__ --password $LIT_PYPI_API_KEY
