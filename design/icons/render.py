"""Render hand-drawn source SVGs to local transparent PNGs. Requires CairoSVG."""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[2]
for svg in sorted(Path(__file__).parent.glob('*.svg')):
    target = ROOT / 'static/icons/duotone' / (svg.stem + '.png')
    target.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(url=str(svg), write_to=str(target), output_width=96, output_height=96)
    print(target.relative_to(ROOT))
