"""Validate editable draw.io structure and core scaffold files without dependencies."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
path = root / 'docs/architecture/cloudprint-architecture.drawio'
preview = root / 'docs/architecture/cloudprint-system-architecture.png'
assert preview.is_file() and preview.stat().st_size > 0, 'Architecture PNG preview is missing'
xml = path.read_text()
assert '<!--' not in xml, 'Diagram XML must not contain comments'
document = ET.fromstring(xml)
pages = document.findall('diagram')
assert len(pages) == 5, 'Expected five architecture pages'
for page in pages:
    cells = page.findall('./mxGraphModel/root/mxCell')
    by_id = {cell.attrib['id']: cell for cell in cells}
    assert len(cells) == len(by_id), f'Duplicate ID in {page.attrib["name"]}'
    assert {'0', '1'} <= by_id.keys()
    for cell in cells:
        if 'parent' in cell.attrib:
            assert cell.attrib['parent'] in by_id
        if cell.get('edge') == '1':
            assert cell.get('source') in by_id and cell.get('target') in by_id
            assert cell.find('mxGeometry').get('relative') == '1'
        if cell.get('vertex') == '1':
            geometry = cell.find('mxGeometry')
            assert geometry is not None
            assert float(geometry.get('width')) > 0 and float(geometry.get('height')) > 0
    print(f'OK: {page.attrib["name"]} ({len(cells)} cells)')
for path in [root / 'package.json', root / 'tsconfig.base.json', root / 'tsconfig.json']:
    json.loads(path.read_text())
for platform in ['android', 'ios', 'web', 'windows', 'macos', 'linux']:
    assert (root / 'apps/cloudprint_app' / platform).is_dir()
print('OK: workspace JSON and Flutter mobile, web, and desktop targets')
