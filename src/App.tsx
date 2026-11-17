import { useState, useEffect } from 'react';
import { Navbar, type VistaActiva, type RolUsuario } from './components/Navbar';
import { CatalogoPublico } from './components/CatalogoPublico';
import { PanelCustodia } from './components/PanelCustodia';
import { DataLakeBI } from './components/DataLakeBI';
import { ApiInspector } from './components/ApiInspector';
import { AsistenteIA } from './components/AsistenteIA';
import { INVENTARIO_INICIAL } from './data/mockDatabase';
import type { ObjetoCustodia } from './types/campus';

export function App() {
  const [rol, setRol] = useState<RolUsuario>('ESTUDIANTE');
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('CATALOGO');
  const [objetos, setObjetos] = useState<ObjetoCustodia[]>(INVENTARIO_INICIAL);

  // Cargar datos reales desde MongoDB Atlas al iniciar
  useEffect(() => {
    fetch('/api/objetos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ObjetoCustodia[] | null) => {
        if (data && data.length > 0) {
          setObjetos(data);
        }
      })
      .catch(() => {});
  }, []);

  const registrarObjeto = async (nuevo: ObjetoCustodia) => {
    setObjetos((prev) => [nuevo, ...prev]);
    try {
      const res = await fetch('/api/objetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      if (res.ok) {
        const guardado: ObjetoCustodia = await res.json();
        setObjetos((prev) =>
          prev.map((item) => (item.radicado_id === guardado.radicado_id ? guardado : item))
        );
      }
    } catch (error) {
      console.error('Error guardando en MongoDB:', error);
    }
  };

  const actualizarEstadoNube = async (objetoId: string, nuevoEstado: ObjetoCustodia['estado']) => {
    setObjetos((prev) =>
      prev.map((obj) => (obj._id === objetoId ? { ...obj, estado: nuevoEstado } : obj))
    );
    try {
      await fetch('/api/objetos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: objetoId, estado: nuevoEstado }),
      });
    } catch (error) {
      console.error('Error actualizando estado en MongoDB:', error);
    }
  };

  const solicitarReclamo = (objetoId: string) => {
    actualizarEstadoNube(objetoId, 'EN_VALIDACION');
  };

  const restituirObjeto = (objetoId: string) => {
    actualizarEstadoNube(objetoId, 'RESTITUIDO');
  };

  const totalEnCustodia = objetos.filter((o) => o.estado === 'EN_CUSTODIA').length;

  return (
    <div className="min-h-screen flex flex-col text-zinc-100">
      <Navbar
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        rol={rol}
        onCambiarRol={setRol}
        totalEnCustodia={totalEnCustodia}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {vistaActiva === 'CATALOGO' && (
          <CatalogoPublico objetos={objetos} onSolicitarReclamo={solicitarReclamo} />
        )}
        {rol === 'ADMIN' && vistaActiva === 'CUSTODIA' && (
          <PanelCustodia
            objetos={objetos}
            onRegistrarObjeto={registrarObjeto}
            onRestituirObjeto={restituirObjeto}
          />
        )}
        {rol === 'ADMIN' && vistaActiva === 'DATALAKE' && <DataLakeBI objetos={objetos} />}
        {rol === 'ADMIN' && vistaActiva === 'API' && <ApiInspector objetos={objetos} />}
      </main>

      <footer className="bg-zinc-950/90 border-t border-zinc-800/80 py-5 text-center text-xs text-zinc-500">
        FindCampus.core • Persistencia Real MongoDB Atlas &amp; Data Lake • Seguridad RBAC &amp; Ley 1581
      </footer>

      <AsistenteIA objetos={objetos} />
    </div>
  );
}

export default App;