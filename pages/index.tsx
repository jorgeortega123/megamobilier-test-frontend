import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type InputFormat = "text" | "image" | "audio";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string;
}

interface CatalogoResponse {
  total: number;
  categorias: string[];
  productos: Producto[];
}

interface CotizacionResponse {
  cliente: string;
  fecha: string;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  subtotal: number;
  iva: number;
  total: number;
  debug?: {
    textoInterpretado: string;
    formatoProcesado: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://megamobilier-test.llampukaq.workers.dev";

export default function Home() {
  const [catalogo, setCatalogo] = useState<CatalogoResponse | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);

  const [formato, setFormato] = useState<InputFormat>("text");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [textoRequerimiento, setTextoRequerimiento] = useState("");
  const [archivoBase64, setArchivoBase64] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<CotizacionResponse | null>(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cotizacionRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!cotizacionRef.current || !resultado) return;

    const canvas = await html2canvas(cotizacionRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    const fileName = `Cotizacion_${resultado.cliente.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);
  };

  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        const response = await fetch(`${API_URL}/catalogo`);
        const data = await response.json();
        setCatalogo(data);
      } catch (err) {
        console.error("Error cargando catalogo:", err);
      } finally {
        setLoadingCatalogo(false);
      }
    };
    fetchCatalogo();
  }, []);

  const productosFiltrados = catalogo?.productos.filter(
    (p) => categoriaActiva === "todas" || p.categoria === categoriaActiva
  ) || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setArchivoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    let requerimiento = "";
    if (formato === "text") {
      if (!textoRequerimiento.trim()) {
        setError("Escribe tu requerimiento");
        return;
      }
      requerimiento = textoRequerimiento;
    } else {
      if (!archivoBase64) {
        setError(`Selecciona un archivo de ${formato === "image" ? "imagen" : "audio"}`);
        return;
      }
      requerimiento = archivoBase64;
    }

    setError("");
    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch(`${API_URL}/cotizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            nombre,
            requerimiento,
            formato,
            email: email || undefined,
            ciudad: ciudad || undefined,
            ingresoFecha: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || "Error en la solicitud");
      }

      setResultado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormato("text");
    setTextoRequerimiento("");
    setArchivoBase64("");
    setNombreArchivo("");
    setResultado(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">MegaMobilier</h1>
            <p className="text-gray-500 text-sm">Cotizador inteligente de mobiliario</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda - Catalogo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Catalogo de Productos</h2>

              {/* Filtro de categorias */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoriaActiva("todas")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoriaActiva === "todas"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Todas
                </button>
                {catalogo?.categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      categoriaActiva === cat
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {loadingCatalogo ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <div className="grid gap-3">
                  {productosFiltrados.map((producto) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{producto.nombre}</h3>
                        <p className="text-sm text-gray-500">{producto.categoria}</p>
                        {producto.descripcion && (
                          <p className="text-xs text-gray-400 mt-1">{producto.descripcion}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600">
                          ${producto.precio.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {productosFiltrados.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay productos en esta categoria</p>
                  )}
                </div>
              )}
            </div>

            {catalogo && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Mostrando {productosFiltrados.length} de {catalogo.total} productos
                </p>
              </div>
            )}
          </div>

          {/* Columna Derecha - Cotizador */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Solicitar Cotizacion</h2>

            {!resultado ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
                  {(["text", "image", "audio"] as InputFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFormato(f);
                        setArchivoBase64("");
                        setNombreArchivo("");
                        setTextoRequerimiento("");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                        formato === f
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {f === "text" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                      {f === "image" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {f === "audio" && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                      {f === "text" ? "Texto" : f === "image" ? "Imagen" : "Audio"}
                    </button>
                  ))}
                </div>

                {/* Input Box */}
                <div className="border border-gray-300 rounded-lg p-4 mb-5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  {formato === "text" ? (
                    <textarea
                      value={textoRequerimiento}
                      onChange={(e) => setTextoRequerimiento(e.target.value)}
                      placeholder="Describe lo que necesitas... Ej: Necesito 5 sillas de oficina y 2 escritorios"
                      className="w-full min-h-[100px] resize-none outline-none text-gray-800 placeholder:text-gray-400"
                    />
                  ) : formato === "image" ? (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {archivoBase64 ? (
                        <div className="flex items-center justify-center gap-3 py-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{nombreArchivo}</span>
                          <button
                            onClick={() => { setArchivoBase64(""); setNombreArchivo(""); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-all"
                        >
                          <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-500 text-sm">Haz clic para subir una imagen</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {archivoBase64 ? (
                        <div className="flex items-center justify-center gap-3 py-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{nombreArchivo}</span>
                          <button
                            onClick={() => { setArchivoBase64(""); setNombreArchivo(""); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => audioInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-all"
                        >
                          <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <p className="text-gray-500 text-sm">Haz clic para subir un audio</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre *"
                    className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (opcional)"
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <input
                      type="text"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ciudad (opcional)"
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center mb-5">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {loading && (
                    <svg className="inline w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? "Procesando..." : "Obtener Cotizacion"}
                </button>
              </>
            ) : (
              /* Resultado */
              <div>
                <div ref={cotizacionRef} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-800 text-white p-6">
                    <h2 className="text-xl font-semibold mb-1">Cotizacion</h2>
                    <p className="text-gray-300 text-sm">Cliente: {resultado.cliente} | Fecha: {resultado.fecha}</p>
                  </div>

                  {resultado.debug?.textoInterpretado && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-5 text-sm text-blue-800">
                      <strong>Interpretado:</strong> {resultado.debug.textoInterpretado}
                    </div>
                  )}

                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                        <th className="text-center py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                        <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">P. Unit.</th>
                        <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-4 px-5 text-sm text-gray-700">{item.nombre}</td>
                          <td className="py-4 px-5 text-sm text-gray-700 text-center">{item.cantidad}</td>
                          <td className="py-4 px-5 text-sm text-gray-700 text-right">${item.precioUnitario.toFixed(2)}</td>
                          <td className="py-4 px-5 text-sm text-gray-700 text-right">${item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bg-gray-50 p-5 border-t border-gray-200">
                    <div className="flex justify-between py-1 text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>${resultado.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm text-gray-600">
                      <span>IVA</span>
                      <span>${resultado.iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-3 mt-2 border-t border-gray-200 text-lg font-semibold text-green-600">
                      <span>Total</span>
                      <span>${resultado.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Guardar PDF
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Nueva Cotizacion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center mt-8 text-gray-400 text-xs">
          MegaMobilier - Prueba ténica Jorge Ortega
        </p>
      </div>
    </div>
  );
}
