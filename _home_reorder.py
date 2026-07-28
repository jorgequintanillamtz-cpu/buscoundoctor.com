import re

path = "src/pages/Home.jsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

markers = {
    "specialties": "      {/* Specialties: las 8 más buscadas */}",
    "insurers":    "      {/* Aseguradoras en nuestro sistema */}",
    "featured":    "      {/* Featured: 6 doctores distribuidos en fila completa (próximamente slider hasta 12) */}",
    "verify":      "      {/* Cómo verificamos a nuestros médicos */}",
    "newsletter":  "      {/* Boletín de salud por correo */}",
    "testimonials":"      {/* Testimonios */}",
    "faq":         "      {/* Preguntas frecuentes */}",
    "cta":         "      {/* CTA: banner navy de ancho completo */}",
    "blog":        "      {/* Blog: última sección antes del footer, slider deslizable con todos los artículos */}",
}

# Verificar que cada marcador aparece exactamente una vez
for name, m in markers.items():
    count = text.count(m)
    assert count == 1, f"marker {name!r} appears {count} times"

tail_marker = "    </div>);\n\n}"
assert text.count(tail_marker) == 1, "tail marker not unique"

head_end = text.index(markers["specialties"])
head = text[:head_end]

positions = sorted(markers.items(), key=lambda kv: text.index(kv[1]))
# positions ya viene en orden de aparición: specialties, insurers, featured, verify, newsletter, testimonials, faq, cta, blog

tail_start = text.index(tail_marker)
tail = text[tail_start:]

sections = {}
for i, (name, marker) in enumerate(positions):
    start = text.index(marker)
    if i + 1 < len(positions):
        end = text.index(positions[i + 1][1])
    else:
        end = tail_start
    sections[name] = text[start:end]

NEW_ZONES = '''      {/* Zonas: busca por zona (solo las que realmente cubrimos) */}
      {zones.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-10">
        <div className="text-center mb-7">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">Busca por zona</h2>
          <p className="text-sm text-muted-foreground mt-1">Especialistas verificados en las zonas donde trabajamos</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {zones.map((z) => (
            <div key={z.id} className="w-40">
              <ZoneCard zone={z} />
            </div>
          ))}
        </div>
      </section>
      )}

'''

NEW_DIFFERENTIATION = '''      {/* Por qué BuscoUnDoctor: diferenciador corto y directo */}
      <section className="bg-brand-blueLight/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-brand-navy">
            Sin comisiones. Sin intermediarios.
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Hablas directo con el médico por WhatsApp — nosotros no cobramos por la consulta ni gestionamos tu cita.
          </p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 mt-8">
            <div>
              <p className="font-heading font-extrabold text-2xl text-brand-blue">$0</p>
              <p className="text-xs text-muted-foreground mt-1">Costo para el paciente</p>
            </div>
            <div>
              <p className="font-heading font-extrabold text-2xl text-brand-blue">100%</p>
              <p className="text-xs text-muted-foreground mt-1">Contacto directo por WhatsApp</p>
            </div>
            <div>
              <p className="font-heading font-extrabold text-2xl text-brand-blue">0</p>
              <p className="text-xs text-muted-foreground mt-1">Comisiones ni intermediarios</p>
            </div>
          </div>
        </div>
      </section>

'''

new_order = (
    head
    + sections["specialties"]
    + NEW_ZONES
    + sections["insurers"]
    + sections["featured"]
    + sections["testimonials"]
    + sections["verify"]
    + NEW_DIFFERENTIATION
    + sections["faq"]
    + sections["cta"]
    + sections["newsletter"]
    + sections["blog"]
    + tail
)

with open(path, "w", encoding="utf-8") as f:
    f.write(new_order)

print("OK. New length:", len(new_order), "old length:", len(text))
