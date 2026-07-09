import sys
import importlib.util

class SrcRedirectFinder:
    def find_spec(self, fullname, path, target=None):
        if fullname.startswith("src."):
            actual_name = fullname[4:]
            try:
                # Find the spec for the actual module (without 'src.')
                spec = importlib.util.find_spec(actual_name)
                if spec is not None:
                    return spec
            except Exception:
                pass
        return None

# Register the redirect finder at the top of sys.meta_path
sys.meta_path.insert(0, SrcRedirectFinder())
