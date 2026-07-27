import re

path = "src/pages/SpecialistProfile.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

pairs = [
    (
        'bg-gradient-to-br from-brand-navy via-brand-navy to-brand-blue shadow-xl p-6 sm:p-10',
        'bg-gradient-to-br from-brand-bluePale to-brand-blueLight shadow-xl p-6 sm:p-10'
    ),
    (
        '<div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />',
        '<div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/60 blur-3xl" />'
    ),
    (
        '<div className="pointer-events-none absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-brand-blue/40 blur-3xl" />',
        '<div className="pointer-events-none absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-brand-blue/15 blur-3xl" />'
    ),
    (
        'className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4"',
        'className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"'
    ),
    (
        'className="font-heading font-extrabold text-3xl sm:text-[2.6rem] leading-[1.1] text-white"',
        'className="font-heading font-extrabold text-3xl sm:text-[2.6rem] leading-[1.1] text-brand-navy"'
    ),
    (
        'className="text-white/80 font-semibold text-base sm:text-lg mt-2"',
        'className="text-brand-navy/70 font-semibold text-base sm:text-lg mt-2"'
    ),
    (
        'className="flex items-center justify-center lg:justify-start gap-1.5 text-sm text-white/70 mt-3"',
        'className="flex items-center justify-center lg:justify-start gap-1.5 text-sm text-brand-navy/70 mt-3"'
    ),
    (
        '<MapPin className="w-4 h-4 flex-shrink-0" />',
        '<MapPin className="w-4 h-4 text-brand-blue flex-shrink-0" />'
    ),
]

# The 3 chip spans share the exact same className string, appearing 3 times.
chip_old = 'className="flex items-center gap-1.5 text-xs font-medium bg-white/10 border border-white/20 text-white rounded-full px-3 py-1.5"'
chip_new = 'className="flex items-center gap-1.5 text-xs font-medium bg-white/80 border border-white text-brand-navy rounded-full px-3 py-1.5"'

pairs += [
    (
        'className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-brand-navy text-sm font-bold px-5 py-3 min-h-[44px] rounded-full shadow-lg transition-colors"',
        'className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-bold px-5 py-3 min-h-[44px] rounded-full shadow-lg transition-colors"'
    ),
    (
        'className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full transition-colors"',
        'className="inline-flex items-center gap-2 bg-white hover:bg-white/80 border border-brand-navy/15 text-brand-navy text-sm font-semibold px-5 py-3 min-h-[44px] rounded-full transition-colors"'
    ),
    (
        'className="text-sm font-semibold text-white bg-white/10 border border-white/20 px-3 py-2 rounded-full"',
        'className="text-sm font-semibold text-brand-navy bg-white border border-brand-navy/10 px-3 py-2 rounded-full"'
    ),
    (
        'className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 mt-8 pt-6 border-t border-white/15"',
        'className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 mt-8 pt-6 border-t border-brand-navy/10"'
    ),
    (
        '<p className="font-heading font-extrabold text-2xl sm:text-3xl text-white">{specialist.years_experience}+</p>',
        '<p className="font-heading font-extrabold text-2xl sm:text-3xl text-brand-navy">{specialist.years_experience}+</p>'
    ),
    (
        '<p className="text-xs text-white/70 mt-0.5">Años de experiencia</p>',
        '<p className="text-xs text-brand-navy/60 mt-0.5">Años de experiencia</p>'
    ),
    (
        'className="font-heading font-extrabold text-2xl sm:text-3xl text-white flex items-center justify-center lg:justify-start gap-1"',
        'className="font-heading font-extrabold text-2xl sm:text-3xl text-brand-navy flex items-center justify-center lg:justify-start gap-1"'
    ),
    (
        '<p className="text-xs text-white/70 mt-0.5">\n                  {allReviews.length > 0 ? `${allReviews.length} reseña${allReviews.length !== 1 ? "s" : ""}` : "Sin reseñas aún"}\n                </p>',
        '<p className="text-xs text-brand-navy/60 mt-0.5">\n                  {allReviews.length > 0 ? `${allReviews.length} reseña${allReviews.length !== 1 ? "s" : ""}` : "Sin reseñas aún"}\n                </p>'
    ),
    (
        '<p className="font-heading font-extrabold text-lg sm:text-xl text-white">',
        '<p className="font-heading font-extrabold text-lg sm:text-xl text-brand-navy">'
    ),
    (
        '<p className="text-xs text-white/70 mt-0.5">Cédula profesional</p>',
        '<p className="text-xs text-brand-navy/60 mt-0.5">Cédula profesional</p>'
    ),
    (
        '<a href="#resenas" className="inline-block text-xs font-semibold text-white/80 hover:text-white hover:underline mt-3">Ver todas las reseñas →</a>',
        '<a href="#resenas" className="inline-block text-xs font-semibold text-brand-blue hover:underline mt-3">Ver todas las reseñas →</a>'
    ),
    (
        '<div className="pointer-events-none absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-emerald-400/20 blur-2xl" />',
        '<div className="pointer-events-none absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-white/70 blur-2xl" />'
    ),
    (
        'className="relative w-48 h-56 sm:w-72 sm:h-80 rounded-[2rem] overflow-hidden border-4 border-white/15 shadow-2xl bg-white/5"',
        'className="relative w-48 h-56 sm:w-72 sm:h-80 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-white/40"'
    ),
    (
        '<div className="w-full h-full bg-white/10 flex items-center justify-center">',
        '<div className="w-full h-full bg-white/60 flex items-center justify-center">'
    ),
    (
        '<span className="font-heading font-bold text-4xl text-white/50">',
        '<span className="font-heading font-bold text-4xl text-brand-navy/30">'
    ),
]

missing = []
for old, new in pairs:
    if old not in content:
        missing.append(old)
    else:
        content = content.replace(old, new, 1)

if chip_old not in content:
    missing.append(chip_old + " (chips, expected 3x)")
else:
    count = content.count(chip_old)
    content = content.replace(chip_old, chip_new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

if missing:
    print("MISSING (not found, skipped):")
    for m in missing:
        print(repr(m))
else:
    print("OK: all replacements applied. chip occurrences replaced:", count)
