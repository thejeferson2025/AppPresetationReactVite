import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import type { Factura } from './models/factura.model';
import { FacturaService } from './services/facturaService';
import './App.css'; 

function App() {
  const [title] = useState('Procesador de Facturas con IA');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(false);
  
  const fileUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    const data = await FacturaService.obtenerTodas();
    setFacturas(data.map((f: Factura) => ({ ...f, editando: false })));
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCargando(true);
      try {
        await FacturaService.subirPdf(file);
        await cargarFacturas();
        
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Factura procesada con éxito',
          showConfirmButton: false,
          timer: 2500,
          toast: true
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Error al procesar el PDF',
          confirmButtonColor: '#0d6efd'
        });
      } finally {
        setCargando(false);
        if (fileUploadRef.current) {
          fileUploadRef.current.value = '';
        }
      }
    }
  };

  const eliminarFactura = (id: number) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará la factura permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await FacturaService.eliminar(id);
        await cargarFacturas();
        
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Factura Eliminada',
          showConfirmButton: false,
          timer: 2500,
          toast: true
        });
      }
    });
  };

  const guardarCambios = async (f: Factura) => {
    await FacturaService.actualizar(f.id, f);
    await cargarFacturas();
    
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: 'Cambios guardados',
      showConfirmButton: false,
      timer: 2500,
      toast: true
    });
  };

  const generarExcel = () => {
    if (facturas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay facturas para exportar a Excel.',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    const datosParaExcel = facturas.map((f, index) => {
      const fechaLimpia = f.fecha ? f.fecha.toString().substring(0, 10).split('-').reverse().join('/') : '';
      return {
        'N°': index + 1,
        'ID Base Datos': f.id,
        'Emisor': f.emisor,
        'RUC': f.nitOId,
        'Fecha': fechaLimpia,
        'Total': f.totalPagar,
        'Moneda': f.moneda
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const nombreArchivo = `Reporte_Facturas_${anio}-${mes}-${dia}.xlsx`;
    
    XLSX.writeFile(wb, nombreArchivo);
  };

  const handleEditChange = (id: number, field: keyof Factura, value: any) => {
    setFacturas(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleEdit = (id: number, estado: boolean) => {
    setFacturas(prev => prev.map(f => f.id === id ? { ...f, editando: estado } : f));
  };

  const formatForDateInput = (isoString: string) => {
    if (!isoString) return '';
    return isoString.toString().substring(0, 10);
  };

  const formatForDisplay = (isoString: string) => {
    if (!isoString) return '';
    return isoString.toString().substring(0, 10).split('-').reverse().join('/');
  };

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>{title}</h1>
          <p>Analiza comprobantes electrónicos</p>
        </div>

        <div className="upload-card">
          <h3>📤 Subir Comprobante (PDF)</h3>
          <input 
            type="file" 
            ref={fileUploadRef} 
            onChange={onFileSelected} 
            accept=".pdf" 
            disabled={cargando} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0' }}>
          <button className="btn-excel" onClick={generarExcel}>
            📊 Descargar Excel
          </button>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th>Emisor</th>
                <th>RUC</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Moneda</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#6c757d', fontStyle: 'italic' }}>
                    No hay facturas procesadas, Sube un comprobante en PDF
                  </td>
                </tr>
              ) : (
                facturas.map((f, i) => (
                  <tr key={f.id}>
                    {!f.editando ? (
                      
                      <>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>{i + 1}</td>
                        <td>{f.emisor}</td>
                        <td>{f.nitOId}</td>
                        <td>{formatForDisplay(f.fecha)}</td>
                        <td style={{ fontWeight: 'bold' }}>{Number(f.totalPagar).toFixed(2)}</td>
                        <td><span className="currency-badge">{f.moneda}</span></td>
                        <td className="actions-cell" style={{ textAlign: 'center', gap: '8px', display: 'flex', justifyContent: 'center' }}>
                          <button className="btn btn-edit" title="Editar" onClick={() => toggleEdit(f.id, true)}>✏️</button>
                          <button className="btn btn-delete" title="Eliminar" onClick={() => eliminarFactura(f.id)}>🗑️</button>
                        </td>
                      </>
                    ) : (
                     
                      <>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>{i + 1}</td>
                        <td>
                          <input className="edit-input" value={f.emisor} onChange={(e) => handleEditChange(f.id, 'emisor', e.target.value)} />
                        </td>
                        <td>
                          <input className="edit-input" value={f.nitOId} onChange={(e) => handleEditChange(f.id, 'nitOId', e.target.value)} />
                        </td>
                        <td>
                          <input className="edit-input" type="date" value={formatForDateInput(f.fecha)} onChange={(e) => handleEditChange(f.id, 'fecha', e.target.value)} />
                        </td>
                        <td>
                          <input className="edit-input" type="number" step="0.01" value={f.totalPagar} onChange={(e) => handleEditChange(f.id, 'totalPagar', parseFloat(e.target.value))} />
                        </td>
                        <td>
                          <select className="edit-select" value={f.moneda} onChange={(e) => handleEditChange(f.id, 'moneda', e.target.value)}>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="MXN">MXN</option>
                          </select>
                        </td>
                        <td className="actions-cell" style={{ textAlign: 'center', gap: '8px', display: 'flex', justifyContent: 'center' }}>
                          <button className="btn btn-save" title="Guardar Cambios" onClick={() => guardarCambios(f)}>💾</button>
                          <button className="btn btn-cancel btn-small" title="Cancelar Edición" onClick={() => toggleEdit(f.id, false)}>❌</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay de Carga */}
      {cargando && (
        <div className="overlay-bloqueante">
          <div className="modal-carga">
            <div className="spinner-modern"></div>
            <p className="loading-text">🤖 IA PROCESANDO</p>
            <small className="loading-subtext">Por favor, no cierres ni recargues la ventana</small>
          </div>
        </div>
      )}
    </>
  );
}

export default App;