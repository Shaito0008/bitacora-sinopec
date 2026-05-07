import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Truck, User, MapPin, Gauge, QrCode, Save, Clock, Hash, CheckCircle, List, FileText, Users, Flag, ExternalLink, Share2, Copy, AlertTriangle, XCircle } from 'lucide-react';

// =========================================================================
// 1. CONFIGURACIÓN DE FIREBASE (Datos extraídos de tu proyecto)
// =========================================================================
const miConfiguracionFirebase = {
  apiKey: "AIzaSyCThE6fbVJFWPGB8gvLw-HJUjSYUN3_ops",
  authDomain: "base-de-datos-26c92.firebaseapp.com",
  projectId: "base-de-datos-26c92",
  storageBucket: "base-de-datos-26c92.firebasestorage.app",
  messagingSenderId: "326623925028",
  appId: "1:326623925028:web:4d3556b83ac96db6be59b1",
  measurementId: "G-C1HGRV3FVX"
};

// Lógica interna para detectar si estamos en el simulador o si ya pusiste tus llaves
const configFinal = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : miConfiguracionFirebase;

const hasFirebaseConfig = Object.keys(configFinal).length > 0 && configFinal.apiKey;

// Solo iniciamos Firebase si ya pusiste la configuración
const app = hasFirebaseConfig ? initializeApp(configFinal) : null;
const auth = hasFirebaseConfig ? getAuth(app) : null;
const db = hasFirebaseConfig ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null); // NUEVO: Para atrapar errores de conexión
  
  const [km, setKm] = useState('');
  const [destino, setDestino] = useState('');
  const [salida, setSalida] = useState('');
  const [pasajeros, setPasajeros] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const [activeTab, setActiveTab] = useState('registro');
  const [historial, setHistorial] = useState([]);
  const [isHistoryOnly, setIsHistoryOnly] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [simulateClientView, setSimulateClientView] = useState(false);

  // 1. Autenticación silenciosa para proteger los datos
  useEffect(() => {
    if (!auth) return; 
    
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error de autenticación:", error);
        setAuthError(error.message); // Guardamos el error para mostrarlo en pantalla
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Obtener la URL actual para generar el QR y enlaces
  useEffect(() => {
    let urlBase = window.location.href.split('?')[0].split('#')[0];
    
    if (urlBase === 'about:srcdoc' || urlBase.startsWith('blob:') || urlBase.includes('stackblitz.io')) {
      urlBase = 'https://mi-bitacora-sinopec.com';
    }
    
    setCurrentUrl(urlBase);
    
    if (window.location.href.includes('view=historial')) {
      setIsHistoryOnly(true);
    }
  }, []);

  // 3. Cargar el historial completo en tiempo real
  useEffect(() => {
    if (!user || !db) return; 
    
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'historial_537');
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const records = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      records.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setHistorial(records);
      if (records.length > 0 && records[0].timestamp) {
        setLastUpdate(records[0].timestamp.toDate());
      }
    }, (error) => {
        console.error("Error al leer datos:", error);
        setAuthError("No se pudieron leer los datos. Verifica las reglas de Firestore.");
    });
    
    return () => unsubscribe();
  }, [user]);

  // 4. Función para agregar un registro nuevo al historial
  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'historial_537');
      await addDoc(colRef, {
        unidad: '537',
        volante: 'Sinopec',
        conductor: 'Henry Ortiz',
        km: km,
        salida: salida,
        destino: destino,
        pasajeros: pasajeros,
        timestamp: serverTimestamp()
      });
      
      setSaveSuccess(true);
      setKm('');
      setDestino('');
      setSalida('');
      setPasajeros('');
      setTimeout(() => setSaveSuccess(false), 3000); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Nunca';
    return date.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const copyHistoryLink = () => {
    const historyLink = `${currentUrl}?view=historial`;
    const tempInput = document.createElement('input');
    tempInput.value = historyLink;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Error al copiar: ", err);
    } finally {
      document.body.removeChild(tempInput);
    }
  };

  // PANTALLA DE ALERTA SI FALTA CONFIGURACIÓN DE FIREBASE
  if (!hasFirebaseConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-amber-500">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Casi listo!</h2>
          <p className="text-slate-600 mb-6">
            La estructura de la bitácora ya está cargada, pero <strong>necesita conectarse a tu base de datos</strong> privada para funcionar.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-700 space-y-3 border border-slate-200">
            <p><strong>Paso 1:</strong> Ve a <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Firebase Console</a> y crea un proyecto.</p>
            <p><strong>Paso 2:</strong> Registra una App Web para obtener tu código <code>firebaseConfig</code>.</p>
            <p><strong>Paso 3:</strong> Pega ese código en la línea 10 de este archivo (<code>App.tsx</code>).</p>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA DE ERROR SI FIREBASE RECHAZA LA CONEXIÓN
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-red-500">
          <div className="flex items-center space-x-3 mb-4 text-red-600">
            <XCircle className="w-8 h-8" />
            <h2 className="text-xl font-bold">Error de Conexión</h2>
          </div>
          <p className="text-slate-600 mb-4 text-sm">
            La aplicación intentó conectarse a Firebase, pero fue rechazada. Esto generalmente ocurre porque faltó un paso de configuración en tu consola de Firebase.
          </p>
          <div className="bg-red-50 p-3 rounded-lg text-red-800 text-xs font-mono break-all mb-4 border border-red-100">
            {authError}
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold">¿Cómo solucionarlo?</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Ve a Firebase Console.</li>
              <li>Entra a <strong>Authentication</strong> -{'>'} <strong>Sign-in method</strong>.</li>
              <li>Asegúrate de que la opción <strong>Anónimo</strong> esté habilitada y guarda los cambios.</li>
              <li>Recarga esta página web.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const showAsReadOnly = isHistoryOnly || simulateClientView;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 flex-col">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-4"></div>
        <p>Cargando bitácora...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Cabecera */}
        <div className="bg-blue-800 p-6 text-white text-center relative">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold tracking-tight">
            {showAsReadOnly ? 'Historial de Viajes' : 'Bitácora de Viaje'}
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {showAsReadOnly ? 'Vista de solo lectura' : 'Control diario de ruta'}
          </p>
          
          {!showAsReadOnly && (
            <button 
              onClick={() => setShowQR(!showQR)}
              className="absolute top-4 right-4 p-2 bg-blue-700 hover:bg-blue-600 rounded-full transition-colors"
              title="Mostrar Código QR"
            >
              <QrCode className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Botón para salir del modo simulación */}
          {simulateClientView && (
            <button 
              onClick={() => setSimulateClientView(false)}
              className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors border border-white/30"
            >
              Volver a modo Administrador
            </button>
          )}
        </div>

        {/* Sección del Código QR Oculto/Visible */}
        {showQR && (
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col items-center animate-in fade-in slide-in-from-top-4">
            <p className="text-sm text-slate-600 mb-4 text-center">
              Imprime este código y pégalo en la unidad. Al escanearlo abrirá esta misma página.
            </p>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`} 
                alt="QR Code" 
                className="w-48 h-48"
              />
            </div>
          </div>
        )}

        {/* Nuevas Pestañas de Navegación */}
        {!showAsReadOnly && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('registro')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'registro' ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Nuevo Registro
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'historial' ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4 mr-2" />
              Ver Historial
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {!showAsReadOnly && activeTab === 'registro' ? (
            <>
              {/* Tarjetas de Datos Fijos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Unidad</p>
                    <p className="font-semibold text-slate-800">537</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">Sinopec</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Conductor Asignado</p>
                  <p className="font-semibold text-slate-800">Henry Ortiz</p>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Formulario de Datos Variables */}
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Gauge className="w-4 h-4 mr-2 text-slate-400" />
                    Kilometraje Actual
                  </label>
                  <input
                    type="number"
                    required
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="Ej. 125000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Flag className="w-4 h-4 mr-2 text-slate-400" />
                    Lugar de Salida
                  </label>
                  <input
                    type="text"
                    required
                    value={salida}
                    onChange={(e) => setSalida(e.target.value)}
                    placeholder="Ej. Base Central"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    Destino / Ruta
                  </label>
                  <input
                    type="text"
                    required
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej. Planta Norte"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-slate-400" />
                    Número de Pasajeros
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pasajeros}
                    onChange={(e) => setPasajeros(e.target.value)}
                    placeholder="Ej. 15"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-lg"
                  />
                </div>

                {/* Información de última actualización */}
                <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Último registro: <strong className="text-slate-700">{formatTime(lastUpdate)}</strong></span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center transition-all ${
                    saveSuccess 
                      ? 'bg-emerald-500 hover:bg-emerald-600' 
                      : 'bg-blue-700 hover:bg-blue-800 shadow-md hover:shadow-lg'
                  } disabled:opacity-70`}
                >
                  {isSaving ? (
                    <span>Guardando...</span>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      ¡Guardado con éxito!
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Actualizar Bitácora
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Vista de Historial */
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              
              {/* Apartado para compartir liga con el cliente */}
              {!showAsReadOnly && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartir historial con cliente
                  </h4>
                  <p className="text-xs text-blue-600 mb-3">
                    Copia y envía este enlace. Quien lo abra solo podrá ver los registros, sin poder modificarlos o agregar nuevos.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${currentUrl}?view=historial`} 
                      className="text-xs flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-slate-500 outline-none select-all"
                    />
                    <button 
                      onClick={copyHistoryLink}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center transition-colors"
                      title="Copiar enlace"
                    >
                      {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setSimulateClientView(true)}
                      className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center transition-colors"
                      title="Simular vista del cliente"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <List className="w-5 h-5 mr-2 text-blue-600" />
                  Registros Anteriores
                </h3>
              </div>
              
              {historial.length === 0 ? (
                <p className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl border border-slate-100">
                  Aún no hay registros guardados. ¡Haz el primero!
                </p>
              ) : (
                historial.map((registro) => (
                  <div key={registro.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                        {formatTime(registro.timestamp?.toDate())}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center">
                        <Hash className="w-3 h-3 mr-1" /> Unidad {registro.unidad}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Kilometraje</p>
                        <p className="font-medium text-slate-800">{registro.km} km</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs flex items-center"><Users className="w-3 h-3 mr-1"/> Pasajeros</p>
                        <p className="font-medium text-slate-800">{registro.pasajeros || '0'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
                      <div>
                        <p className="text-slate-500 text-xs mb-1 flex items-center"><Flag className="w-3 h-3 mr-1"/> Salida</p>
                        <p className="text-slate-800 text-sm">{registro.salida || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1"/> Destino</p>
                        <p className="text-slate-800 text-sm">{registro.destino}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}