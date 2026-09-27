import importlib, inspect, pkgutil
from copy import deepcopy

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
DETECTORS_BY_ID = {detector.ID: detector for detector in DETECTORS}

def get_detectors() -> list:
    """Return detector metadata safe to expose to the web client."""
    return [
        {
            "ID": detector.ID,
            "TYPE": detector.TYPE,
            "SEVERITY": detector.SEVERITY,
            "DESCRIPTION": detector.DESCRIPTION,
        }
        for detector in DETECTORS
    ]


def get_detector_config(detector_id: str) -> dict:
    """Return a detached copy of a detector's server-side defaults."""
    detector = DETECTORS_BY_ID.get(detector_id)
    if detector is None:
        raise KeyError(f"Unknown detector: {detector_id}")
    return deepcopy(getattr(detector, "CONFIG", {}))


def create_detector_instance(detector_id: str, config: dict | None = None):
    """Create an isolated detector instance with a rule's stored config."""
    template = DETECTORS_BY_ID.get(detector_id)
    if template is None:
        raise KeyError(f"Unknown detector: {detector_id}")

    detector = type(template)()
    defaults = get_detector_config(detector_id)
    stored_config = config if isinstance(config, dict) else {}
    normalized_config = {}
    for key, value in stored_config.items():
        normalized_key = key.lower() if isinstance(key, str) else key
        if normalized_key not in normalized_config or key == normalized_key:
            normalized_config[normalized_key] = value

    detector.CONFIG = {
        **defaults,
        **{key: value for key, value in normalized_config.items() if key in defaults},
    }
    return detector
