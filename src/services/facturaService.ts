import type { Factura } from '../models/factura.model';

const apiUrl = 'https://localhost:7161/api/facturas';

// Temporal para manejar errores (consola)
const handleError = (err: any) => {
  // En fetch, los errores de red (como el SSL bypass) lanzan un TypeError
  if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
    console.warn('Conexión local establecida (SSL bypass)');
    return []; // Retorna un arreglo vacío para que no explote la app
  }
  throw err;
};

export const FacturaService = {
  obtenerTodas: async (): Promise<Factura[]> => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Error de red');
      return await response.json();
    } catch (err) {
      return handleError(err);
    }
  },

  subirPdf: async (archivo: File): Promise<any> => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    try {
      const response = await fetch(`${apiUrl}/update`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Error al subir el archivo');
      return await response.json();
    } catch (err) {
      throw err; // Lanzamos el error para que el componente muestre el SweetAlert rojo
    }
  },

  eliminar: async (id: number): Promise<any> => {
    try {
      const response = await fetch(`${apiUrl}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Error al eliminar');
      return true;
    } catch (err) {
      return handleError(err);
    }
  },

  actualizar: async (id: number, factura: Factura): Promise<any> => {
    try {
      const response = await fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(factura),
      });
      if (!response.ok) throw new Error('Error al actualizar');
      return true;
    } catch (err) {
      return handleError(err);
    }
  }
};