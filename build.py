from pathlib import Path
from jinja2 import Environment, FileSystemLoader

SRC_DIR = Path('freeworld-website')
DIST_DIR = SRC_DIR / 'dist'
DIST_DIR.mkdir(parents=True, exist_ok=True)

env = Environment(loader=FileSystemLoader(str(SRC_DIR)))

for template_path in SRC_DIR.glob('*.html'):
    template = env.get_template(template_path.name)
    rendered = template.render()
    (DIST_DIR / template_path.name).write_text(rendered)
