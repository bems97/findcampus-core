export type CategoriaObjeto = 'ELECTRONICA' | 'BILLETERA' | 'DOCUMENTOS' | 'ACCESORIOS';

export interface AtributosPolimorficos {
  // Electrónica
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  incluye_cargador?: boolean;
  // Billetera
  material?: string;
  color?: string;
  cantidad_documentos?: number;
  contiene_efectivo?: boolean;
  // Documentos / Accesorios
  tipo_documento?: string;
  titular_enmascarado?: string;
  descripcion_detalle?: string;
}

export interface ObjetoCustodia {
  _id: string;
  radicado_id: string;
  categoria: CategoriaObjeto;
  titulo: string;
  sede: 'Sede Principal' | 'Sede Sur' | 'Sede Norte';
  edificio: string;
  fecha_hallazgo: string;
  estado: 'EN_CUSTODIA' | 'EN_VALIDACION' | 'RESTITUIDO';
  evidencia_lake_url: string;
  hash_sha256: string;
  atributos: AtributosPolimorficos;
}