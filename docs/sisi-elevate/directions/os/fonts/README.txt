SiSi Oś nocy: font files

sisi-night-display-800.woff2
  Source: Big Shoulders Display (variable) by the Big Shoulders Project Authors, OFL 1.1, no Reserved Font Name.
  Fetched from https://github.com/google/fonts/tree/main/ofl/bigshouldersdisplay (BigShouldersDisplay[wght].ttf).
  Modified: instanced to wght 800 (static); digits 0-9 rebuilt as tabular (all ten share the widest advance,
  outlines centred in the cell); kerning between digits zeroed; subset to Latin, Latin-1, Latin Extended-A and
  the punctuation of the five site languages; family renamed "SiSi Night Display".
  Licence: OFL-BigShouldersDisplay.txt

sisi-night-text-var.woff2
  Source: Hanken Grotesk (variable) by the Hanken Grotesk Project Authors, OFL 1.1, no Reserved Font Name.
  Fetched from https://github.com/google/fonts/tree/main/ofl/hankengrotesk (HankenGrotesk[wght].ttf).
  Modified: wght axis limited to 400-700 (still variable); subset as above; family renamed "SiSi Night Text".
  Digits are tabular in the source (all ten advance 560/1000), so no rebuild was needed.
  Licence: OFL-HankenGrotesk.txt

Rebuild: python3 tools/build_fonts.py <dir with BigShouldersDisplay.ttf and HankenGrotesk.ttf> fonts/
Check:   python3 tools/verify_fonts.py
