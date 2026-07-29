import re

path = "src/pages/admin/AdminSiteImages.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''      {/* Íconos de especialidades */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-foreground">Íconos de especialidades</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Son los íconos circulares que se ven en "Especialidades más buscadas" en la página de inicio y en el buscador. Haz clic en cualquiera para cambiarlo.
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={specialtySearch}
            onChange={(e) => setSpecialtySearch(e.target.value)}
            placeholder="Buscar especialidad..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm outline-none focus:border-brand-blue"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {filteredSpecialties.map((s) => {
            const CurrentIcon = ICONS[s.icon] || Heart;
            const isOpen = pickerOpenFor === s.id;
            return (
              <div key={s.id} className="relative">
                <button
                  onClick={() => setPickerOpenFor(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-border/50 hover:border-brand-blue/40 hover:bg-brand-bluePale/30 transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                    <CurrentIcon className="w-4 h-4 text-brand-blue" />
                  </span>
                  <span className="text-xs font-medium text-foreground truncate">{s.name}</span>
                </button>

                {isOpen && (
                  <div className="absolute z-20 top-full mt-1 left-0 w-64 bg-white rounded-2xl border border-border/50 shadow-xl p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                      Elegir ícono para "{s.name}"
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ICON_NAMES.map((name) => {
                        const OptionIcon = ICONS[name];
                        const active = (s.icon || "Heart") === name;
                        return (
                          <button
                            key={name}
                            title={name}
                            onClick={() => changeSpecialtyIcon(s, name)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              active ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground hover:bg-brand-bluePale hover:text-brand-blue"
                            }`}
                          >
                            <OptionIcon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredSpecialties.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">Sin resultados.</p>
          )}
        </div>
      </section>'''

new = '''      {/* Íconos de especialidades */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-foreground">Íconos de especialidades</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Son las 8 que se ven en "Especialidades más buscadas" en la página de inicio. Para cada una puedes elegir un ícono o subir tu propia imagen (webp, png, jpg).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {homepageSpecialties.map((s) => {
            const CurrentIcon = ICONS[s.icon] || Heart;
            const isOpen = pickerOpenFor === s.id;
            const isUploading = uploadingIconFor === s.id;
            return (
              <div key={s.id} className="relative">
                <button
                  onClick={() => setPickerOpenFor(isOpen ? null : s.id)}
                  className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-brand-blue/40 hover:bg-brand-bluePale/30 transition-colors text-center"
                >
                  <span className="w-12 h-12 rounded-full bg-brand-bluePale overflow-hidden flex items-center justify-center flex-shrink-0">
                    {s.icon_image_url ? (
                      <img src={s.icon_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CurrentIcon className="w-5 h-5 text-brand-blue" />
                    )}
                  </span>
                  <span className="text-xs font-medium text-foreground truncate w-full">{s.name}</span>
                </button>

                {isOpen && (
                  <div className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-72 bg-white rounded-2xl border border-border/50 shadow-xl p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">"{s.name}"</p>
                      <button onClick={() => setPickerOpenFor(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <label className="flex items-center justify-center gap-2 w-full mb-3 px-3 py-2.5 rounded-xl border border-dashed border-brand-blue/40 bg-brand-bluePale/30 text-xs font-medium text-brand-navy cursor-pointer hover:bg-brand-bluePale/60 transition-colors">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Subir imagen propia
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSpecialtyIconImage(s, e)} disabled={isUploading} />
                    </label>
                    {s.icon_image_url && (
                      <button
                        onClick={() => removeSpecialtyIconImage(s)}
                        className="flex items-center justify-center gap-1.5 w-full mb-3 text-xs font-medium text-destructive hover:underline"
                      >
                        <X className="w-3 h-3" />
                        Quitar imagen y usar ícono
                      </button>
                    )}

                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">O elegir un ícono</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ICON_NAMES.map((name) => {
                        const OptionIcon = ICONS[name];
                        const active = !s.icon_image_url && (s.icon || "Heart") === name;
                        return (
                          <button
                            key={name}
                            title={name}
                            onClick={() => changeSpecialtyIcon(s, name)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              active ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground hover:bg-brand-bluePale hover:text-brand-blue"
                            }`}
                          >
                            <OptionIcon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>'''

if old not in content:
    print("OLD BLOCK NOT FOUND")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
