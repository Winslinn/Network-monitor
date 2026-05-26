import sys, importlib, inspect, pkgutil

from os import getenv
from pathlib import Path

PROJECT_ROOT = Path(getenv('PROJECT_ROOT'))

def load_detectors() -> list:
    detectors = []
    package_dir = PROJECT_ROOT / 'src' / 'detectors'

    for _, module_name, _ in pkgutil.iter_modules([str(package_dir)]):
        module = importlib.import_module(f'detectors.{module_name}')

        for _, cls in inspect.getmembers(module, inspect.isclass):
            if hasattr(cls, 'analyze') and cls.__module__ == module.__name__:
                detectors.append(cls())

    return detectors

DETECTORS = load_detectors()