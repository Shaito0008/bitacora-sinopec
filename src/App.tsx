import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Truck, User, MapPin, Gauge, QrCode, Save, Clock, Hash, CheckCircle, List, FileText, Users, Flag, ExternalLink, Share2, Copy, AlertTriangle, XCircle } from 'lucide-react';

// =========================================================================
// 1. PEGA TU CONFIGURACIÓN DE FIREBASE AQUÍ
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

// =========================================================================
// 2. PEGA TU ENLACE DE MAKE.COM AQUÍ ADENTRO DE LAS COMILLAS
// =========================================================================
const enlaceMake = "https://hook.us2.make.com/h64toyfqrtwmrw3hlc0menh99bi0kwp9";


const configFinal = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : miConfiguracionFirebase;
const hasFirebaseConfig = Object.keys(configFinal).length > 0 && configFinal.apiKey;

const app = hasFirebaseConfig ? initializeApp(configFinal) : null;
const auth = hasFirebaseConfig ? getAuth(app) : null;
const db = hasFirebaseConfig ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [km, setKm] = useState('');
  const [destino, setDestino] = useState('');
  const [salida, setSalida] = useState('');
  const [pasajeros, setPasajeros] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const [activeTab, setActiveTab] = useState('registro');
  const [historial, setHistorial] = useState<any[]>([]);
  const [isHistoryOnly, setIsHistoryOnly] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [simulateClientView, setSimulateClientView] = useState(false);

  useEffect(() => {
    if (!auth) return; 
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error: any) {
        setAuthError(error.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let urlBase = window.location.href.split('?')[0].split('#')[0];
    if (urlBase === 'about:srcdoc' || urlBase.startsWith('blob:') || urlBase.includes('stackblitz.io')) {
      urlBase = 'https://mi-bitacora-sinopec.com';
    }
    setCurrentUrl(urlBase);
    if (window.location.href.includes('view=historial')) setIsHistoryOnly(true);
  }, []);

  useEffect(() => {
    if (!user || !db) return; 
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'historial_537');
    const unsubscribe = onSnapshot(colRef, (snapshot: any) => {
      const records: any[] = [];
      snapshot.forEach((doc: any) => { records.push({ id: doc.id, ...doc.data() }); });
      records.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setHistorial(records);
      if (records.length > 0 && records[0].timestamp) setLastUpdate(records[0].timestamp.toDate());
    }, (error: any) => { setAuthError("No se pudieron leer los datos."); });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // 1. Guarda en tu base de datos Firebase
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

      // 2. NUEVO: Envía la información a Make.com (Google Sheets)
      if (enlaceMake.includes("make.com")) {
        await fetch(enlaceMake, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: new Date().toLocaleString('es-MX'),
            unidad: '537',
            conductor: 'Henry Ortiz',
            km: km,
            salida: salida,
            destino: destino,
            pasajeros: pasajeros || '0'
          })
        });
      }
      
      setSaveSuccess(true);
      setKm(''); setDestino(''); setSalida(''); setPasajeros('');
      setTimeout(() => setSaveSuccess(false), 3000); 
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return 'Nunca';
    return date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const copyHistoryLink = () => {
    const historyLink = `${currentUrl}?view=historial`;
    const tempInput = document.createElement('input');
    tempInput.value = historyLink;
    document.body.appendChild(tempInput);
    tempInput.select();
    try { document.execCommand('copy'); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); } 
    catch (err) {} finally { document.body.removeChild(tempInput); }
  };

  if (!hasFirebaseConfig) return <div className="min-h-screen flex items-center justify-center p-4">Configura Firebase.</div>;
  if (authError) return <div className="min-h-screen flex items-center justify-center p-4">Error de conexión.</div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  const showAsReadOnly = isHistoryOnly || simulateClientView;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Cabecera */}
        <div className="bg-blue-800 p-6 text-white text-center relative">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-90" />
          <h1 className="text-2xl font-bold tracking-tight">{showAsReadOnly ? 'Historial de Viajes' : 'Bitácora de Viaje'}</h1>
          <p className="text-blue-200 text-sm mt-1">{showAsReadOnly ? 'Vista de solo lectura' : 'Control diario de ruta'}</p>
          {!showAsReadOnly && (
            <button onClick={() => setShowQR(!showQR)} className="absolute top-4 right-4 p-2 bg-blue-700 hover:bg-blue-600 rounded-full">
              <QrCode className="w-5 h-5 text-white" />
            </button>
          )}
          {simulateClientView && (
            <button onClick={() => setSimulateClientView(false)} className="mt-4 px-4 py-2 bg-white/20 text-white rounded-lg text-sm border border-white/30">
              Volver a modo Administrador
            </button>
          )}
        </div>

        {/* Pestañas */}
        {!showAsReadOnly && (
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab('registro')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center ${activeTab === 'registro' ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50' : 'text-slate-500'}`}><FileText className="w-4 h-4 mr-2" />Nuevo</button>
            <button onClick={() => setActiveTab('historial')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center ${activeTab === 'historial' ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50' : 'text-slate-500'}`}><List className="w-4 h-4 mr-2" />Historial</button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {!showAsReadOnly && activeTab === 'registro' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><Hash className="w-5 h-5" /></div>
                  <div><p className="text-xs text-slate-500 font-medium">Unidad</p><p className="font-semibold text-slate-800">537</p></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-700"><Gauge className="w-5 h-5" /></div>
                  <div><p className="font-semibold text-slate-800 text-lg">Sinopec</p></div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700"><User className="w-5 h-5" /></div>
                <div><p className="text-xs text-slate-500 font-medium">Conductor Asignado</p><p className="font-semibold text-slate-800">Henry Ortiz</p></div>
              </div>
              <hr className="border-slate-100" />
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center"><Gauge className="w-4 h-4 mr-2 text-slate-400" />Kilometraje Actual</label>
                  <input type="number" required value={km} onChange={(e) => setKm(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center"><Flag className="w-4 h-4 mr-2 text-slate-400" />Lugar de Salida</label>
                  <input type="text" required value={salida} onChange={(e) => setSalida(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center"><MapPin className="w-4 h-4 mr-2 text-slate-400" />Destino / Ruta</label>
                  <input type="text" required value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center"><Users className="w-4 h-4 mr-2 text-slate-400" />Número de Pasajeros</label>
                  <input type="number" required min="0" value={pasajeros} onChange={(e) => setPasajeros(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 text-lg" />
                </div>
                <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl text-white font-semibold flex items-center justify-center transition-all ${saveSuccess ? 'bg-emerald-500' : 'bg-blue-700'} disabled:opacity-70`}>
                  {isSaving ? 'Guardando...' : saveSuccess ? '¡Guardado con éxito!' : 'Actualizar Bitácora'}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {!showAsReadOnly && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center"><Share2 className="w-4 h-4 mr-2" />Compartir historial</h4>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={`${currentUrl}?view=historial`} className="text-xs flex-1 px-3 py-2 rounded-lg border border-blue-200" />
                    <button onClick={copyHistoryLink} className="bg-blue-600 text-white px-3 py-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              {historial.map((registro) => (
                <div key={registro.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-md">{formatTime(registro.timestamp?.toDate())}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div><p className="text-slate-500 text-xs">Kilometraje</p><p className="font-medium">{registro.km} km</p></div>
                    <div><p className="text-slate-500 text-xs">Pasajeros</p><p className="font-medium">{registro.pasajeros || '0'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
                    <div><p className="text-slate-500 text-xs">Salida</p><p className="text-sm">{registro.salida || 'N/A'}</p></div>
                    <div><p className="text-slate-500 text-xs">Destino</p><p className="text-sm">{registro.destino}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
