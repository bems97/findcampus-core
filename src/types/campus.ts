export type RolUsuario = 'ESTUDIANTE' | 'ADMIN';

export type CategoriaObjeto =
  | 'ELECTRONICA'
  | 'DOCUMENTOS'
  | 'ACCESORIOS'
  | 'LIBROS_UTILES'
  | 'OTROS';

export type EstadoObjeto = 'EN_CUSTODIA' | 'EN_VALIDACION' | 'RESTITUIDO';

export interface AtributosObjeto {
  marca?: string;
  modelo?: string;
  color?: string;
  numero_serie?: string;
  documento_identidad?: string;
  observaciones?: string;
  [key: string]: unknown;
}

export interface ObjetoCustodia {
  _id?: string;
  radicado_id: string;
  titulo: string;
  categoria: CategoriaObjeto | string;
  sede: string;
  edificio?: string;
  estado: EstadoObjeto;
  fecha_hallazgo?: string;
  imagen_url?: string;
  atributos?: AtributosObjeto;
  metadatos?: AtributosObjeto;
  [key: string]: unknown;
}

export interface AlertaTemprana {
  _id?: string;
  codigo_alerta: string;
  titulo: string;
  categoria: string;
  descripcion?: string;
  sede: string;
  lugar_aproximado?: string;
  nombre_estudiante: string;
  correo_estudiante: string;
  telefono_contacto?: string;
  foto_referencia?: string | null;
  estado: 'ACTIVA' | 'EN_REVISION' | 'RESUELTA';
  nota_admin?: string;
  created_at?: string;
}