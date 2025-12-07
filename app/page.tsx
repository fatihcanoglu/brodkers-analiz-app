"use client";
import { useState, useEffect, FormEvent } from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis } from 'recharts';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('THYAO');

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // --- DİKKAT: AŞAĞIDAKİ LINKI KENDİ RENDER LINKINLE DEĞİŞTİR ---
    // Örnek: const RENDER_URL = "https://borsa-api-x1y2.onrender.com";
    // Sonunda eğik çizgi (/) olmamasına dikkat et.
    
    const RENDER_URL = "BURAYA_RENDER_LINKINI_YAPISTIR"; 

    fetch(`${RENDER_URL}/api/analyze?symbol=${activeSymbol}`)
      .then((res) => {
        if (!res.ok) throw new Error('Sunucuya ulaşılamadı veya hisse bulunamadı.');
        return res.json();
      })
      .then((incomingData) => {
        if(incomingData.error) throw new Error(incomingData.error);
        setData(incomingData);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setError(err.message || "Veri alınırken hata oluştu.");
        setLoading(false);
      });
  }, [activeSymbol]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) setActiveSymbol(searchText.toUpperCase().trim());
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="animate-pulse">Veriler Render Sunucusundan Çekiliyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-10 px-4 font-sans">
      <form onSubmit={handleSearch} className="mb-8 flex gap-2 w-full max-w-md">
        <input 
          type="text" 
          placeholder="Hisse Kodu (Örn: EREGL)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="bg-slate-800 text-white px-4 py-3 rounded-l-lg w-full border border-slate-700 outline-none focus:border-blue-500 transition-colors"
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-r-lg font-bold transition-colors">ARA</button>
      </form>

      {error && <div className="text-red-400 mb-6 bg-red-900/20 p-4 rounded-lg border border-red-800 max-w-2xl w-full">⚠️ {error}</div>}

      {data && !error && (
        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-2xl border border-slate-700">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight">{data.symbol}</h1>
              <p className="text-slate-400 text-sm mt-1">{data.irket_adi}</p>
            </div>
            <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 ${
              data.renk === 'green' ? 'bg-green-500/10 border-green-500 text-green-400' : 
              data.renk === 'red' ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
            }`}>
              <span className="text-xs font-bold uppercase opacity-60">PUAN</span>
              <span className="text-3xl font-black">{data.puan}</span>
            </div>
          </div>

          <div className="flex items-end gap-4 mb-8">
            <div className="text-6xl font-bold text-white tracking-tighter">₺{data.fiyat}</div>
            <div className={`text-lg font-bold mb-3 px-3 py-1 rounded-lg flex items-center gap-1 ${
                parseFloat(data.yuzde_degisim) >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
                {parseFloat(data.yuzde_degisim) >= 0 ? '▲' : '▼'} %{data.yuzde_degisim}
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-2xl p-5 mb-8 border border-slate-600/30 backdrop-blur-sm">
            <div className="flex justify-between items-center border-b border-slate-600/30 pb-3 mb-3">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">GRAHAM TEORİK DEĞER</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    data.analiz.graham_durum.includes('İskontolu') ? 'bg-green-500/20 text-green-400' : 
                    data.analiz.graham_durum.includes('Primli') ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                }`}>{data.analiz.graham_durum}</span>
            </div>
            <div className="flex items-baseline gap-2">
                 <p className="text-4xl font-bold text-white">₺{data.analiz.graham}</p>
                 <p className="text-xs text-slate-500">Model Hesaplaması</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Box title="RSI" value={data.analiz.rsi} />
            <Box title="F/K" value={data.analiz.fk} />
            <Box title="PD/DD" value={data.analiz.pd_dd} />
          </div>

          <div className="h-64 w-full bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 relative mb-8">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.grafik_data}>
                 <XAxis dataKey="tarih" hide />
                 <YAxis domain={['auto', 'auto']} hide />
                 <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} 
                    itemStyle={{color: '#cbd5e1'}}
                    formatter={(value: any) => [`₺${value}`, '']}
                    labelStyle={{display:'none'}}
                 />
                 <Legend verticalAlign="top" height={36} iconType="circle"/>
                 <Line name="Fiyat" type="monotone" dataKey="fiyat" stroke={data.renk === 'green'?'#4ade80':data.renk==='red'?'#f87171':'#facc15'} strokeWidth={3} dot={false} activeDot={{r: 6}} />
                 <Line name="SMA 50" type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                 <Line name="SMA 200" type="monotone" dataKey="sma200" stroke="#f97316" strokeWidth={2} dot={false} />
               </LineChart>
             </ResponsiveContainer>
          </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-slate-800 p-6 rounded-2xl border border-blue-500/20 relative overflow-hidden mb-6">
             <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                🤖 OTOMATİK ANALİZ
             </h3>
             <p className="text-slate-300 text-sm leading-relaxed font-medium">
                {data.analiz.ai_yorum}
             </p>
          </div>
          
          <div className="mt-4 border-t border-slate-700/50 pt-4">
             <p className="text-[10px] text-slate-500 font-mono text-center mb-4">Son Güncelleme: {data.guncelleme_saati}</p>
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <p className="text-[9px] text-slate-500 leading-relaxed text-justify">
                   <strong>YASAL UYARI:</strong> Burada yer alan veriler yatırım tavsiyesi değildir. Gecikmeli olabilir.
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-slate-700/40 p-4 rounded-xl border border-slate-600/30 flex flex-col items-center justify-center text-center hover:bg-slate-700/60 transition-colors">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">{title}</p>
      <p className="text-lg text-white font-bold">{value}</p>
    </div>
  );
}
