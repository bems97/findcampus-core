import { useState } from 'react';
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

  const registrarObjeto = (nuevo: ObjetoCustodia) => {
    setObjetos((prev) => [nuevo, ...prev]);
  };

  const solicitarReclamo = (objetoId: string) => {
    setObjetos((prev) =>
      prev.map((obj) => (obj._id === objetoId ? { ...obj, estado: 'EN_VALIDACION' } : obj))
    );
  };

  const restituirObjeto = (objetoId: string) => {
    setObjetos((prev) =>
      prev.map((obj) => (obj._id === objetoId ? { ...obj, estado: 'RESTITUIDO' } : obj))
    );
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
        FindCampus.core • Arquitectura NoSQL (MongoDB) &amp; Data Lake (MinIO S3) • Seguridad RBAC &amp; Ley 1581
      </footer>

      <AsistenteIA objetos={objetos} />
    </div>
  );
}

export default App;